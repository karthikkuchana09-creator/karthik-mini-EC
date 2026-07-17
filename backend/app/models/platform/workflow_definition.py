from sqlalchemy import String, Integer, Boolean, ForeignKey, Text, DateTime, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.user import User


class WorkflowDefinition(TenantMixin, Base):
    __tablename__ = "workflow_definitions"
    __table_args__ = (
        Index("ix_wd_tenant_entity", "tenant_id", "entity_type"),
        Index("ix_wd_tenant_status", "tenant_id", "status"),
        Index("ix_wd_tenant_created", "tenant_id", "created_at"),
        Index("ix_wd_creator", "created_by"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    trigger_event: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    rules: Mapped[list["WorkflowRule"]] = relationship("WorkflowRule", back_populates="workflow", order_by="WorkflowRule.priority")
    executions: Mapped[list["WorkflowExecution"]] = relationship("WorkflowExecution", back_populates="workflow")
    stages: Mapped[list["WorkflowStage"]] = relationship("WorkflowStage", back_populates="workflow", order_by="WorkflowStage.stage_order")
    transitions: Mapped[list["WorkflowTransition"]] = relationship("WorkflowTransition", back_populates="workflow")
