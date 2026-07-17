from sqlalchemy import String, Integer, ForeignKey, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin


class WorkflowStage(TenantMixin, Base):
    __tablename__ = "workflow_stages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflow_definitions.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stage_order: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    assignee_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    assignee_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    required_approvals: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    workflow: Mapped["WorkflowDefinition"] = relationship("WorkflowDefinition", back_populates="stages")
