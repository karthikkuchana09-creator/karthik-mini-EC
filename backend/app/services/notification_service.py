from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.core.log import get_logger
from app.core.config import settings
from app.core.cache import cached, cache_delete_pattern
from app.core.websocket_manager import manager

logger = get_logger("notification_service")


def _invalidate_notification_cache(user_id: int):
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(cache_delete_pattern(f"notifications:unread:{user_id}"))
    finally:
        loop.close()


def create_notification(
    db: Session,
    user_id: int,
    message: str,
):
    notification = Notification(
        user_id=user_id,
        message=message,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    logger.info("Notification created for user_id=%d", user_id)
    import asyncio
    asyncio.ensure_future(manager.send_notification(user_id, message, notification.id))
    _invalidate_notification_cache(user_id)
    return notification


def get_notifications(
    db: Session,
    current_user,
    unread_only: bool = False,
    page: int = 1,
    size: int = 20,
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    from app.utils.pagination import paginate_query

    return paginate_query(
        db, query.order_by(Notification.created_at.desc()),
        page=page, size=size,
    )


@cached(prefix="notifications:unread", ttl=lambda: settings.CACHE_TTL_NOTIFICATION, exclude_args=[0])
def get_unread_count(db: Session, current_user):
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .count()
    )
    return {"unread_count": count}


def mark_as_read(db: Session, notification_id: int, current_user):
    logger.debug("Marking notification id=%d as read for user_id=%d", notification_id, current_user.id)
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(404, "Notification not found")

    notification.is_read = True
    db.commit()

    _invalidate_notification_cache(current_user.id)
    return {"message": "Notification marked as read"}


def mark_all_as_read(db: Session, current_user):
    logger.debug("Marking all notifications as read for user_id=%d", current_user.id)
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()

    _invalidate_notification_cache(current_user.id)
    return {"message": "All notifications marked as read"}


def delete_notification(db: Session, notification_id: int, current_user):
    logger.info("Deleting notification id=%d for user_id=%d", notification_id, current_user.id)
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(404, "Notification not found")

    db.delete(notification)
    db.commit()

    _invalidate_notification_cache(current_user.id)
    return {"message": "Notification deleted"}
