from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.channel import Channel
    from app.models.approval_document import ApprovalDocument


class Approval(TenantMixin, Base):
    __tablename__ = "approvals"
    __tenant_fk__ = "organizations.id"
    __tenant_fk_ondelete__ = "SET NULL"
    __tenant_nullable__ = True

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)

    requested_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)

    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)
    current_level: Mapped[str] = mapped_column(String(50), default="manager", index=True)
    is_escalated: Mapped[bool] = mapped_column(Boolean, default=False)

    sla_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    sla_due_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    current_escalation_to: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    workspace_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True, index=True)
    channel_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("channels.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_approvals_requested_by_status", "requested_by", "status"),
        Index("ix_approvals_current_level_status", "current_level", "status"),
    )

    requester: Mapped["User"] = relationship("User", foreign_keys=[requested_by])
    workspace: Mapped[Optional["Workspace"]] = relationship(back_populates="approvals")
    channel: Mapped[Optional["Channel"]] = relationship(back_populates="approvals")
    approval_documents: Mapped[list["ApprovalDocument"]] = relationship(back_populates="approval")
