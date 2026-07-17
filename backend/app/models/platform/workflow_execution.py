from sqlalchemy import String, Integer, Boolean, ForeignKey, Text, DateTime, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin


class WorkflowExecution(TenantMixin, Base):
    __tablename__ = "workflow_executions"
    __table_args__ = (
        Index("ix_we_tenant_entity", "tenant_id", "entity_type", "entity_id"),
        Index("ix_we_tenant_status", "tenant_id", "status"),
        Index("ix_we_tenant_workflow", "tenant_id", "workflow_id"),
        Index("ix_we_tenant_started", "tenant_id", "started_at"),
        Index("ix_we_starter", "started_by"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflow_definitions.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    trigger_event: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    result_log: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    workflow: Mapped["WorkflowDefinition"] = relationship("WorkflowDefinition", back_populates="executions")
