from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class SLARule(Base):
    __tablename__ = "sla_rules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    module_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    allowed_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    escalation_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    escalation_after_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    creator: Mapped["User"] = relationship("User", back_populates="sla_rules")
