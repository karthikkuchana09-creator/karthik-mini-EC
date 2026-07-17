from sqlalchemy import String, Integer, Boolean, ForeignKey, Text, DateTime, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin


class NotificationRule(TenantMixin, Base):
    __tablename__ = "notification_rules"
    __table_args__ = (
        Index("ix_nr_tenant_event", "tenant_id", "event_type"),
        Index("ix_nr_tenant_active", "tenant_id", "is_active"),
        Index("ix_nr_tenant_created", "tenant_id", "created_at"),
        Index("ix_nr_tenant_creator", "tenant_id", "created_by"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True,
        comment="Event that triggers this rule: task_assignment, approval_request, meeting_reminder, escalation_alert, mention_alert, document_update",
    )
    channel: Mapped[str] = mapped_column(
        String(50), nullable=False, default="in_app",
        comment="Notification channel: in_app, email, or both",
    )
    condition_config: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="JSON conditions: e.g. {\"priority\": \"high\", \"roles\": [\"manager\"]}",
    )
    template_config: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="JSON message templates: e.g. {\"subject\": \"...\", \"body\": \"...\"}",
    )
    recipient_config: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="JSON recipient rules: e.g. {\"roles\": [\"admin\", \"manager\"], \"include_creator\": true}",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
