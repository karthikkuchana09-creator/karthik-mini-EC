from sqlalchemy import String, Integer, Boolean, ForeignKey, Text, DateTime, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base


class WorkflowRule(Base):
    __tablename__ = "workflow_rules"
    __table_args__ = (
        Index("ix_wr_workflow_priority", "workflow_id", "priority"),
        Index("ix_wr_workflow_active", "workflow_id", "is_active"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflow_definitions.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    condition_config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    action_config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    workflow: Mapped["WorkflowDefinition"] = relationship("WorkflowDefinition", back_populates="rules")
