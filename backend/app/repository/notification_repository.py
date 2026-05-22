from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.notification import Notification


def list_notifications_for_user(db: Session, user_id: int, unread_only: bool = False, category: str = None):
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    if category:
        stmt = stmt.where(Notification.type == category)
    stmt = stmt.order_by(Notification.created_at.desc())
    return paginate(db, stmt)
