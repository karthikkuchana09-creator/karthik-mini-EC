from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.task import Task
from app.models.user import User
from app.schemas.workspace_task import WorkspaceTaskCreate, WorkspaceTaskAssign
from app.repository.workspace_task_repository import list_tasks_by_workspace
from app.services.workspace_membership_service import (
    validate_workspace_member,
    validate_workspace_task_assignment,
)
from app.services.audit_log_service import log_action
from app.services.phase10_notification_helper import notify_task_assigned
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
    return list_tasks_by_workspace(db, workspace_id)


def get_workspace_task(
    db: Session,
    workspace_id: int,
    task_id: int,
    user: User,
) -> Task:
    validate_workspace_member(db, workspace_id, user)

    task = db.scalar(
        select(Task)
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

    task = db.scalar(
        select(Task)
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
