from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    approval_id: Mapped[int] = mapped_column(Integer, ForeignKey("approvals.id"), index=True)
    action_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))

    action: Mapped[str] = mapped_column(String(50))
    comment: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
