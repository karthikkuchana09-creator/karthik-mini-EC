"""
Notification helper service.

Provides reusable functions for sending notifications with
consistent error handling, batching, and user lookup.

Usage:
    from app.core.notification_helper import notify_user, notify_task_users

    notify_user(db, user_id, "Your task was updated", type="task_status")
    notify_task_users(db, task, "Task completed", type="task_status")
"""
from typing import Optional, Sequence

from sqlalchemy.orm import Session

from app.models.notification import NotificationType, NotificationCategory, NotificationPriority
from app.models.task import Task
from app.models.approval import Approval
from app.models.user import User
from app.services.notification_service import create_notification
from app.core.log import get_logger

logger = get_logger("notification_helper")


def notify_user(
    db: Session,
    user_id: int,
    message: str,
    notification_type: str = NotificationType.system,
    category: Optional[str] = None,
    priority: str = NotificationPriority.medium,
) -> bool:
    """
    Send a notification to a single user.

    Args:
        db: Database session.
        user_id: Recipient user ID.
        message: Notification body.
        notification_type: Type string (e.g. ``task_status``).
        category: Category string (e.g. ``task``, ``approval``).
        priority: Priority level (low / medium / high).

    Returns:
        True if the notification was created, False otherwise.
    """
    try:
        create_notification(
            db, user_id, message,
            type=notification_type,
            notification_type=category,
            priority=priority,
        )
        return True
    except Exception as exc:
        logger.error("Failed to notify user %d: %s", user_id, exc)
        return False


def notify_users(
    db: Session,
    user_ids: Sequence[int],
    message: str,
    notification_type: str = NotificationType.system,
    category: Optional[str] = None,
    priority: str = NotificationPriority.medium,
) -> int:
    """
    Send a notification to multiple users.

    Returns the count of successfully created notifications.
    """
    count = 0
    for uid in user_ids:
        if notify_user(db, uid, message, notification_type, category, priority):
            count += 1
    return count


def notify_task_users(
    db: Session,
    task: Task,
    message: str,
    notification_type: str = NotificationType.task_status,
    priority: str = NotificationPriority.medium,
    include_creator: bool = True,
    include_assignee: bool = True,
) -> int:
    """
    Send a notification to all relevant users for a task.

    Returns the count of successfully created notifications.
    """
    user_ids: set[int] = set()
    if include_assignee and task.assigned_to_id:
        user_ids.add(task.assigned_to_id)
    if include_creator and task.created_by_id:
        user_ids.add(task.created_by_id)
    return notify_users(db, list(user_ids), message, notification_type, NotificationCategory.task, priority)


def notify_approval_users(
    db: Session,
    approval: Approval,
    message: str,
    notification_type: str = NotificationType.approval_action,
    priority: str = NotificationPriority.high,
    include_requester: bool = True,
    include_escalation_target: bool = True,
) -> int:
    """
    Send a notification to all relevant users for an approval.

    Returns the count of successfully created notifications.
    """
    user_ids: set[int] = set()
    if include_requester:
        user_ids.add(approval.requested_by)
    if include_escalation_target and approval.current_escalation_to:
        user_ids.add(approval.current_escalation_to)
    return notify_users(db, list(user_ids), message, notification_type, NotificationCategory.approval, priority)
