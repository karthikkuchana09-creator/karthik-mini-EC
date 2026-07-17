from sqlalchemy import String, Integer, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin


class WorkflowTransition(TenantMixin, Base):
    __tablename__ = "workflow_transitions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflow_definitions.id"), nullable=False, index=True)
    from_stage_id: Mapped[Optional[int]] = mapped_column(ForeignKey("workflow_stages.id"), nullable=True)
    to_stage_id: Mapped[int] = mapped_column(ForeignKey("workflow_stages.id"), nullable=False)
    transition_name: Mapped[str] = mapped_column(String(100), nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(20), default="manual")
    condition_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    workflow: Mapped["WorkflowDefinition"] = relationship("WorkflowDefinition", back_populates="transitions")
