from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.notification import Notification, NotificationType
from app.core.log import get_logger
from app.core.config import settings
from app.core.cache import cached, cache_delete_pattern
from app.websocket.manager import manager
from app.utils.pagination import paginate_query

logger = get_logger("notification_service")


def _invalidate_notification_cache(user_id: int):
    import asyncio
    try:
        loop = asyncio.get_running_loop()
        asyncio.ensure_future(cache_delete_pattern(f"notifications:unread:{user_id}"))
    except RuntimeError:
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
    type: NotificationType = NotificationType.system,
):
    notification = Notification(
        user_id=user_id,
        message=message,
        type=type,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    logger.info(
        "Notification created: user_id=%d type=%s id=%d",
        user_id, type, notification.id,
    )

    import asyncio
    asyncio.ensure_future(manager.send_notification(user_id, message, notification.id))

    _invalidate_notification_cache(user_id)
    return notification


def create_task_assignment_notification(db: Session, user_id: int, task_id: int, task_title: str):
    message = f"You have been assigned to Task #{task_id}: {task_title}"
    notification = create_notification(db, user_id, message, NotificationType.task_assignment)
    import asyncio
    asyncio.ensure_future(manager.notify_task("assigned", task_id, task_title, assigned_user_id=user_id))
    return notification


def create_task_status_notification(db: Session, user_id: int, task_id: int, task_title: str, new_status: str):
    message = f"Task #{task_id}: {task_title} changed to {new_status}"
    notification = create_notification(db, user_id, message, NotificationType.task_status)
    import asyncio
    asyncio.ensure_future(manager.notify_task("status_update", task_id, task_title, assigned_user_id=user_id, new_status=new_status))
    return notification


def create_approval_request_notification(db: Session, user_id: int, approval_id: int, task_title: str):
    message = f"Approval #{approval_id} requested for: {task_title}"
    notification = create_notification(db, user_id, message, NotificationType.approval_request)
    import asyncio
    asyncio.ensure_future(manager.notify_approval("requested", approval_id, 0, task_title, target_user_id=user_id))
    return notification


def create_approval_action_notification(db: Session, user_id: int, approval_id: int, task_id: int, task_title: str, action: str):
    message = f"Approval #{approval_id} was {action} for: {task_title}"
    notification = create_notification(db, user_id, message, NotificationType.approval_action)
    import asyncio
    asyncio.ensure_future(manager.notify_approval(action, approval_id, task_id, task_title, target_user_id=user_id))
    return notification


def create_comment_notification(db: Session, user_id: int, task_id: int):
    message = f"New comment on Task #{task_id}"
    notification = create_notification(db, user_id, message, NotificationType.comment)
    import asyncio
    asyncio.ensure_future(manager.notify_task("comment", task_id, "", assigned_user_id=user_id))
    return notification


def create_document_notification(db: Session, user_id: int, document_id: int, filename: str, task_id: int):
    message = f"Document uploaded: {filename} to Task #{task_id}"
    notification = create_notification(db, user_id, message, NotificationType.document_upload)
    import asyncio
    asyncio.ensure_future(manager.notify_document("uploaded", document_id, filename, user_id, task_id=task_id))
    return notification


def create_system_notification(db: Session, user_id: int, message: str):
    return create_notification(db, user_id, message, NotificationType.system)


def get_notifications(
    db: Session,
    current_user,
    unread_only: bool = False,
    category: NotificationType | None = None,
    page: int = 1,
    size: int = 20,
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    if category is not None:
        query = query.filter(Notification.type == category)

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


def get_notification_stats(db: Session, current_user):
    total = db.query(Notification).filter(Notification.user_id == current_user.id).count()
    unread = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    read = total - unread

    rows = (
        db.query(Notification.type, func.count(Notification.id))
        .filter(Notification.user_id == current_user.id)
        .group_by(Notification.type)
        .all()
    )
    by_category = [{"type": row[0], "count": row[1]} for row in rows]

    return {
        "total": total,
        "unread": unread,
        "read": read,
        "by_category": by_category,
    }


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


def mark_multiple_as_read(db: Session, notification_ids: list[int], current_user):
    count = (
        db.query(Notification)
        .filter(
            Notification.id.in_(notification_ids),
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()

    _invalidate_notification_cache(current_user.id)
    logger.info("Marked %d notifications as read for user_id=%d", count, current_user.id)
    return {"message": f"{count} notifications marked as read"}


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
