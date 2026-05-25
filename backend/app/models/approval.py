from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)

    requested_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)

    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)
    current_level: Mapped[str] = mapped_column(String(50), default="manager", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_approvals_requested_by_status", "requested_by", "status"),
        Index("ix_approvals_current_level_status", "current_level", "status"),
    )

    requester: Mapped["User"] = relationship("User", foreign_keys=[requested_by])
