import re
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.user import User
from app.services.notification_service import (
    create_notification,
    create_task_assignment_notification,
    create_document_notification,
    NotificationType,
    NotificationCategory,
    NotificationPriority,
)
from app.services.notification_preference_service import get_or_create_preferences
from app.core.log import get_logger

logger = get_logger("phase10_notification_helper")

CATEGORY_MAP = {
    "task": "task_notifications",
    "approval": "approval_notifications",
    "document": "document_notifications",
}


def _user_wants(db: Session, user_id: int, category: str) -> bool:
    prefs = get_or_create_preferences(db, user_id)
    if not prefs.in_app_enabled:
        return False
    field = CATEGORY_MAP.get(category)
    if field and not getattr(prefs, field, True):
        return False
    return True


def notify_task_assigned(db: Session, user_id: int, task_id: int, task_title: str):
    if not _user_wants(db, user_id, "task"):
        return None
    return create_task_assignment_notification(db, user_id, task_id, task_title)


def notify_task_document_uploaded(
    db: Session,
    user_id: int,
    document_id: int,
    filename: str,
    task_id: int,
):
    if not _user_wants(db, user_id, "document"):
        return None
    return create_document_notification(db, user_id, document_id, filename, task_id)


def notify_approval_document_uploaded(
    db: Session,
    user_id: int,
    document_id: int,
    filename: str,
    approval_id: int,
):
    if not _user_wants(db, user_id, "document"):
        return None
    message = f"Document uploaded: {filename} to Approval #{approval_id}"
    notification = create_notification(
        db, user_id, message, NotificationType.document_upload,
        notification_type=NotificationCategory.document,
        priority=NotificationPriority.medium,
    )
    logger.info("Approval document notification sent to user %d for document %d", user_id, document_id)
    return notification


def notify_mention(
    db: Session,
    mentioned_user_id: int,
    mentioned_by_name: str,
    context_label: str,
    context_url: str | None = None,
):
    prefs = get_or_create_preferences(db, mentioned_user_id)
    if not prefs.in_app_enabled:
        return None
    message = f"You were mentioned by {mentioned_by_name} in {context_label}"
    notification = create_notification(
        db, mentioned_user_id, message, NotificationType.system,
        notification_type=NotificationCategory.task,
        priority=NotificationPriority.medium,
    )
    logger.info("Mention notification sent to user %d by %s in %s", mentioned_user_id, mentioned_by_name, context_label)
    return notification


def process_mentions(db: Session, content: str, sender: User, context_label: str):
    usernames = set(re.findall(r'@(\w+)', content))
    for raw in usernames:
        username = raw.strip()
        mentioned = db.scalar(select(User).where(User.name == username))
        if mentioned and mentioned.id != sender.id:
            notify_mention(db, mentioned.id, sender.name, context_label)
