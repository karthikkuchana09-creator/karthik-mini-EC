from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.task import Task
from app.models.user import User
from app.schemas.workspace_task import WorkspaceTaskCreate, WorkspaceTaskUpdate, WorkspaceTaskStatusUpdate, WorkspaceTaskAssign
from app.repository.workspace_task_repository import list_tasks_by_workspace
from app.services.workspace_membership_service import (
    validate_workspace_member,
    validate_workspace_admin,
    validate_workspace_task_assignment,
)
from app.services.audit_log_service import log_action
from app.services.phase10_notification_helper import notify_task_assigned
from app.core.tenant import tenant_filter
from app.core.log import get_logger

logger = get_logger("workspace_task_service")


def create_workspace_task(
    db: Session,
    workspace_id: int,
    data: WorkspaceTaskCreate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    validate_workspace_task_assignment(db, workspace_id, user, data.assigned_to_id)

    tid = getattr(user, "tenant_id", None)
    task = Task(
        workspace_id=workspace_id,
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
        new_value={"title": task.title, "status": "todo", "priority": task.priority, "assigned_to_id": task.assigned_to_id, "workspace_id": workspace_id},
        module_name="workspace_task", action_type="create", record_id=task.id,
        ip_address=ip_address, user_agent=user_agent,
    )
    notify_task_assigned(db, data.assigned_to_id, task.id, task.title)
    logger.info("Workspace task %d created in workspace %d by user %d", task.id, workspace_id, user.id)
    return task


def list_workspace_tasks(
    db: Session,
    workspace_id: int,
    user: User,
):
    validate_workspace_member(db, workspace_id, user)
    tid = getattr(user, "tenant_id", None)
    return list_tasks_by_workspace(db, workspace_id, tenant_id=tid)


def get_workspace_task(
    db: Session,
    workspace_id: int,
    task_id: int,
    user: User,
) -> Task:
    validate_workspace_member(db, workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .options(selectinload(Task.assignee), selectinload(Task.creator))
        .where(
            Task.id == task_id,
            Task.workspace_id == workspace_id,
            Task.channel_id.is_(None),
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    return task


def assign_workspace_task(
    db: Session,
    workspace_id: int,
    task_id: int,
    data: WorkspaceTaskAssign,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    validate_workspace_task_assignment(db, workspace_id, user, data.assigned_to_id)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.workspace_id == workspace_id,
            Task.channel_id.is_(None),
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    assigned_user = db.scalar(select(User).where(User.id == data.assigned_to_id))
    if not assigned_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found")

    old_assigned_to = task.assigned_to_id
    task.assigned_to_id = data.assigned_to_id
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    log_action(
        db, user.id, "assign", "task", task_id,
        old_value={"assigned_to_id": old_assigned_to},
        new_value={"assigned_to_id": data.assigned_to_id},
        module_name="workspace_task", action_type="assign", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    notify_task_assigned(db, data.assigned_to_id, task_id, task.title)
    logger.info("Workspace task %d assigned to user %d by user %d", task_id, data.assigned_to_id, user.id)
    return task


def update_workspace_task(
    db: Session,
    workspace_id: int,
    task_id: int,
    data: WorkspaceTaskUpdate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    validate_workspace_admin(db, workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.workspace_id == workspace_id,
            Task.channel_id.is_(None),
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    old = {"title": task.title, "description": task.description, "priority": task.priority, "due_date": str(task.due_date) if task.due_date else None}
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.priority is not None:
        task.priority = data.priority
    if data.due_date is not None:
        task.due_date = data.due_date
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    log_action(
        db, user.id, "update", "task", task_id,
        old_value=old,
        new_value={"title": task.title, "description": task.description, "priority": task.priority, "due_date": str(task.due_date) if task.due_date else None},
        module_name="workspace_task", action_type="update", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Workspace task %d updated by user %d", task_id, user.id)
    return task


def delete_workspace_task(
    db: Session,
    workspace_id: int,
    task_id: int,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    validate_workspace_admin(db, workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.workspace_id == workspace_id,
            Task.channel_id.is_(None),
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    db.delete(task)
    db.commit()

    log_action(
        db, user.id, "delete", "task", task_id,
        old_value={"title": task.title, "status": task.status},
        module_name="workspace_task", action_type="delete", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Workspace task %d deleted by user %d", task_id, user.id)
    return {"message": "Task deleted"}


def update_workspace_task_status(
    db: Session,
    workspace_id: int,
    task_id: int,
    data: WorkspaceTaskStatusUpdate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    validate_workspace_member(db, workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.workspace_id == workspace_id,
            Task.channel_id.is_(None),
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
        module_name="workspace_task", action_type="update_status", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Workspace task %d status changed to %s by user %d", task_id, data.status, user.id)
    return task
