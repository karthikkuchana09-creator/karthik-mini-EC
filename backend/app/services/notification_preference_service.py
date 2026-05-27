from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification_preference import NotificationPreference
from app.models.user import User
from app.schemas.notification_preference import NotificationPreferenceUpdate
from app.core.log import get_logger

logger = get_logger("notification_preference_service")

DEFAULT_PREFERENCES = {
    "in_app_enabled": True,
    "email_enabled": True,
    "task_notifications": True,
    "approval_notifications": True,
    "escalation_notifications": True,
    "document_notifications": True,
}


def get_or_create_preferences(db: Session, user_id: int) -> NotificationPreference:
    prefs = db.scalar(
        select(NotificationPreference).where(
            NotificationPreference.user_id == user_id
        )
    )
    if prefs:
        return prefs

    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(404, "User not found")

    prefs = NotificationPreference(user_id=user_id, **DEFAULT_PREFERENCES)
    db.add(prefs)
    db.commit()
    db.refresh(prefs)

    logger.info("Auto-created notification preferences for user_id=%d", user_id)
    return prefs


def create_default_preferences(db: Session, user_id: int) -> NotificationPreference:
    existing = db.scalar(
        select(NotificationPreference).where(
            NotificationPreference.user_id == user_id
        )
    )
    if existing:
        raise HTTPException(409, "Notification preferences already exist for this user")

    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(404, "User not found")

    prefs = NotificationPreference(user_id=user_id, **DEFAULT_PREFERENCES)
    db.add(prefs)
    db.commit()
    db.refresh(prefs)

    logger.info("Created default notification preferences for user_id=%d", user_id)
    return prefs


def update_preferences(
    db: Session, user_id: int, data: NotificationPreferenceUpdate, current_user
) -> NotificationPreference:
    if current_user.id != user_id:
        role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
        if role != "admin":
            raise HTTPException(403, "You can only update your own notification preferences")

    prefs = get_or_create_preferences(db, user_id)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)

    db.commit()
    db.refresh(prefs)

    logger.info("Updated notification preferences for user_id=%d", user_id)
    return prefs
