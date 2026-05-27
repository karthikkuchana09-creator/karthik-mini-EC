from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ApprovalEscalation(Base):
    __tablename__ = "approval_escalations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    approval_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("approvals.id"), nullable=False, index=True
    )
    escalated_from: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    escalated_to: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    escalation_level: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    escalated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    approval: Mapped["Approval"] = relationship("Approval")
    escalated_by_user: Mapped["User"] = relationship(
        "User", foreign_keys=[escalated_from]
    )
    escalated_to_user: Mapped["User"] = relationship(
        "User", foreign_keys=[escalated_to]
    )
