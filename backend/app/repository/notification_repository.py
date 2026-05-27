from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.schemas.notification import NotificationFilter
from app.core.pagination import QueryBuilder


def list_notifications_for_user(
    db: Session,
    user_id: int,
    filters: NotificationFilter,
):
    query = select(Notification).where(Notification.user_id == user_id)
    return (
        QueryBuilder(db, Notification, query)
        .search(filters.q, [Notification.message])
        .filter_exact(
            type=filters.type,
            notification_type=filters.notification_type,
            priority=filters.priority,
            is_read=filters.is_read,
        )
        .sort(filters.sort_by, filters.sort_order, [
            "created_at", "priority", "type", "is_read",
        ])
        .paginate(filters.page, filters.size)
    )
