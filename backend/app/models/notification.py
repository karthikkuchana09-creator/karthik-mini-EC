from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from datetime import datetime
from app.db.base import Base


class NotificationType:
    task_assignment = "task_assignment"
    task_status = "task_status"
    approval_request = "approval_request"
    approval_action = "approval_action"
    comment = "comment"
    document_upload = "document_upload"
    system = "system"
    ai_alert = "ai_alert"
    sla_breach = "sla_breach"

    ALL = [
        task_assignment, task_status, approval_request, approval_action,
        comment, document_upload, system, ai_alert, sla_breach,
    ]


class NotificationCategory:
    task = "task"
    approval = "approval"
    escalation = "escalation"
    comment = "comment"
    document = "document"
    sla = "sla"

    ALL = [task, approval, escalation, comment, document, sla]


class NotificationPriority:
    low = "low"
    medium = "medium"
    high = "high"

    ALL = [low, medium, high]


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default=NotificationType.system, index=True)
    notification_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default=NotificationPriority.medium, index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), index=True)

    __table_args__ = (
        Index("ix_notifications_user_id_is_read", "user_id", "is_read"),
    )
