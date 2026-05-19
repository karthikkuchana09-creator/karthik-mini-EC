import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Index, Enum as SAEnum
from datetime import datetime
from app.db.base import Base


class NotificationType(str, enum.Enum):
    task_assignment = "task_assignment"
    task_status = "task_status"
    approval_request = "approval_request"
    approval_action = "approval_action"
    comment = "comment"
    document_upload = "document_upload"
    system = "system"
    ai_alert = "ai_alert"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(String(500), nullable=False)
    type = Column(SAEnum(NotificationType), nullable=False, default=NotificationType.system, index=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_notifications_user_id_is_read", "user_id", "is_read"),
    )
