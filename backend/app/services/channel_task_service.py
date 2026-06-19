from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.task import Task
from app.models.user import User
from app.models.channel import Channel
from app.schemas.channel_task import ChannelTaskCreate, ChannelTaskUpdate, ChannelTaskStatusUpdate, ChannelTaskAssign
from app.repository.channel_task_repository import list_tasks_by_channel
from app.services.channel_membership_service import (
    validate_channel_member,
    validate_channel_moderator,
    validate_channel_task_assignment,
    _get_channel_or_404,
)
from app.services.audit_log_service import log_action
from app.services.phase10_notification_helper import notify_task_assigned
from app.core.tenant import tenant_filter
from app.core.log import get_logger

logger = get_logger("channel_task_service")


def create_channel_task(
    db: Session,
    channel_id: int,
    data: ChannelTaskCreate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    validate_channel_task_assignment(db, channel_id, user, data.assigned_to_id)
    channel = _get_channel_or_404(db, channel_id)

    tid = getattr(user, "tenant_id", None)
    task = Task(
        workspace_id=channel.workspace_id,
        channel_id=channel_id,
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
        new_value={"title": task.title, "status": "todo", "priority": task.priority, "assigned_to_id": task.assigned_to_id, "workspace_id": channel.workspace_id, "channel_id": channel_id},
        module_name="channel_task", action_type="create", record_id=task.id,
        ip_address=ip_address, user_agent=user_agent,
    )
    notify_task_assigned(db, data.assigned_to_id, task.id, task.title)
    logger.info("Channel task %d created in channel %d by user %d", task.id, channel_id, user.id)
    return task


def list_channel_tasks(
    db: Session,
    channel_id: int,
    user: User,
):
    validate_channel_member(db, channel_id, user)
    tid = getattr(user, "tenant_id", None)
    return list_tasks_by_channel(db, channel_id, tenant_id=tid)


def get_channel_task(
    db: Session,
    channel_id: int,
    task_id: int,
    user: User,
) -> Task:
    validate_channel_member(db, channel_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .options(selectinload(Task.assignee), selectinload(Task.creator))
        .where(
            Task.id == task_id,
            Task.channel_id == channel_id,
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    return task


def assign_channel_task(
    db: Session,
    channel_id: int,
    task_id: int,
    data: ChannelTaskAssign,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    validate_channel_task_assignment(db, channel_id, user, data.assigned_to_id)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.channel_id == channel_id,
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
        module_name="channel_task", action_type="assign", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    notify_task_assigned(db, data.assigned_to_id, task_id, task.title)
    logger.info("Channel task %d assigned to user %d by user %d", task_id, data.assigned_to_id, user.id)
    return task


def update_channel_task(
    db: Session,
    channel_id: int,
    task_id: int,
    data: ChannelTaskUpdate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    validate_channel_moderator(db, channel_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.channel_id == channel_id,
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
        module_name="channel_task", action_type="update", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Channel task %d updated by user %d", task_id, user.id)
    return task


def delete_channel_task(
    db: Session,
    channel_id: int,
    task_id: int,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    validate_channel_moderator(db, channel_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.channel_id == channel_id,
        )
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    db.delete(task)
    db.commit()

    log_action(
        db, user.id, "delete", "task", task_id,
        old_value={"title": task.title, "status": task.status},
        module_name="channel_task", action_type="delete", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Channel task %d deleted by user %d", task_id, user.id)
    return {"message": "Task deleted"}


def update_channel_task_status(
    db: Session,
    channel_id: int,
    task_id: int,
    data: ChannelTaskStatusUpdate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Task:
    validate_channel_member(db, channel_id, user)

    tid = getattr(user, "tenant_id", None)
    task = db.scalar(
        tenant_filter(select(Task), Task, tid)
        .where(
            Task.id == task_id,
            Task.channel_id == channel_id,
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
        module_name="channel_task", action_type="update_status", record_id=task_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Channel task %d status changed to %s by user %d", task_id, data.status, user.id)
    return task
