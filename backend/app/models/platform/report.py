from sqlalchemy import String, Integer, ForeignKey, Text, DateTime, Boolean, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin


class Report(TenantMixin, Base):
    __tablename__ = "reports"
    __table_args__ = (
        Index("ix_rpt_tenant_entity", "tenant_id", "entity_type"),
        Index("ix_rpt_tenant_created", "tenant_id", "created_at"),
        Index("ix_rpt_tenant_creator", "tenant_id", "created_by_id"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[int] = mapped_column("created_by_id", ForeignKey("users.id"), nullable=False)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
