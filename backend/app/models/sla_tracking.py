from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class SLATracking(Base):
    __tablename__ = "sla_tracking"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    module_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    record_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    sla_rule_id: Mapped[int] = mapped_column(Integer, ForeignKey("sla_rules.id"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    due_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    breach_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_sla_tracking_module_record", "module_name", "record_id"),
    )

    sla_rule: Mapped["SLARule"] = relationship("SLARule")
