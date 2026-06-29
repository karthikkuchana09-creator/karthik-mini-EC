from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.task import Task
from app.models.user import User
from app.schemas.project_task import ProjectTaskCreate, ProjectTaskUpdate, ProjectTaskStatusUpdate, ProjectTaskAssign
from app.repository.project_task_repository import list_tasks_by_project
from app.services.business_validation_service import (
    get_project_or_404, get_user_or_404, validate_workspace_member, validate_workspace_admin,
    validate_team_belongs_to_project, validate_user_belongs_to_team,
)
from app.services.audit_log_service import log_action
from app.services.phase10_notification_helper import notify_task_assigned
from app.core.tenant import tenant_filter
from app.core.log import get_logger

logger = get_logger("project_task_service")


def create_project_task(
    db: Session,
    project_id: int,
    data: ProjectTaskCreate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    if data.team_id is not None:
        validate_team_belongs_to_project(db, data.team_id, project_id)

    if data.assigned_to_id is not None:
        get_user_or_404(db, data.assigned_to_id)
        if data.team_id is not None:
            validate_user_belongs_to_team(db, data.assigned_to_id, data.team_id)

    tid = getattr(user, "tenant_id", None)
    task = Task(
        workspace_id=project.workspace_id,
        project_id=project_id,
        team_id=data.team_id,
        channel_id=None,
        title=data.title,
        description=data.description,
        status="todo",
        priority=data.priority,
        due_date=data.due_date,
        created_by_id=user.id,
        assigned_to_id=data.assigned_to_id,
        tenant_id=tid,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    log_action(
        db, user.id, "create", "task", task.id,
        new_value={"title": task.title, "status": "todo", "priority": task.priority, "assigned_to_id": task.assigned_to_id, "project_id": project_id, "team_id": data.team_id},
        module_name="project_task", action_type="create", record_id=task.id,
        ip_address=ip_address, user_agent=user_agent,
    )
    if data.assigned_to_id:
        notify_task_assigned(db, data.assigned_to_id, task.id, task.title)
    logger.info("Project task %d created in project %d by user %d", task.id, project_id, user.id)
    return task


def list_project_tasks(
    db: Session,
    project_id: int,
    user: User,
):
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)
    tid = getattr(user, "tenant_id", None)
    return list_tasks_by_project(db, project_id, tenant_id=tid)


def get_project_task(
    db: Session,
    project_id: int,
    task_id: int,
    user: User,
) -> Task:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .options(selectinload(Task.assignee), selectinload(Task.creator))
        .where(
            Task.id == task_id,
            Task.project_id == project_id,
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    return task


def assign_project_task(
    db: Session,
    project_id: int,
    task_id: int,
    data: ProjectTaskAssign,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.project_id == project_id,
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    assigned_user = get_user_or_404(db, data.assigned_to_id)

    if task.team_id is not None:
        validate_user_belongs_to_team(db, data.assigned_to_id, task.team_id)

    old_assigned_to = task.assigned_to_id
    task.assigned_to_id = data.assigned_to_id
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    log_action(
        db, user.id, "assign", "task", task_id,
        old_value={"assigned_to_id": old_assigned_to},
        new_value={"assigned_to_id": data.assigned_to_id},
        module_name="project_task", action_type="assign", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    notify_task_assigned(db, data.assigned_to_id, task_id, task.title)
    logger.info("Project task %d assigned to user %d by user %d", task_id, data.assigned_to_id, user.id)
    return task


def update_project_task(
    db: Session,
    project_id: int,
    task_id: int,
    data: ProjectTaskUpdate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    project = get_project_or_404(db, project_id)
    validate_workspace_admin(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.project_id == project_id,
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if data.team_id is not None:
        validate_team_belongs_to_project(db, data.team_id, project_id)

    old = {"title": task.title, "description": task.description, "priority": task.priority, "due_date": str(task.due_date) if task.due_date else None}
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.priority is not None:
        task.priority = data.priority
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.status is not None:
        task.status = data.status
    if data.team_id is not None:
        task.team_id = data.team_id
    if data.assigned_to_id is not None:
        if task.team_id is not None:
            validate_user_belongs_to_team(db, data.assigned_to_id, task.team_id)
        task.assigned_to_id = data.assigned_to_id
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    log_action(
        db, user.id, "update", "task", task_id,
        old_value=old,
        new_value={"title": task.title, "description": task.description, "priority": task.priority, "due_date": str(task.due_date) if task.due_date else None},
        module_name="project_task", action_type="update", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Project task %d updated by user %d", task_id, user.id)
    return task


def delete_project_task(
    db: Session,
    project_id: int,
    task_id: int,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    project = get_project_or_404(db, project_id)
    validate_workspace_admin(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.project_id == project_id,
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    db.delete(task)
    db.commit()

    log_action(
        db, user.id, "delete", "task", task_id,
        old_value={"title": task.title, "status": task.status},
        module_name="project_task", action_type="delete", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Project task %d deleted by user %d", task_id, user.id)
    return {"message": "Task deleted"}


def update_project_task_status(
    db: Session,
    project_id: int,
    task_id: int,
    data: ProjectTaskStatusUpdate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.project_id == project_id,
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    old_status = task.status
    task.status = data.status
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    log_action(
        db, user.id, "update_status", "task", task_id,
        old_value={"status": old_status},
        new_value={"status": data.status},
        module_name="project_task", action_type="update_status", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Project task %d status changed to %s by user %d", task_id, data.status, user.id)
    return task
