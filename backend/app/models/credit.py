from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, DateTime, Text, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base


class TransactionType(str, enum.Enum):
    deduction = "deduction"
    refund = "refund"
    purchase = "purchase"
    admin_adjustment = "admin_adjustment"
    reset = "reset"


class UsageCredit(Base):
    __tablename__ = "usage_credits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    total_credits: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    used_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    remaining_credits: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    low_credit_threshold: Mapped[int] = mapped_column(Integer, default=20)
    low_credit_alert_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    last_reset_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    transactions: Mapped[list["CreditTransaction"]] = relationship("CreditTransaction", back_populates="credit_account", foreign_keys="CreditTransaction.credit_id")

    @property
    def usage_pct(self) -> float:
        if self.total_credits == 0:
            return 0.0
        return round((self.used_credits / self.total_credits) * 100, 1)

    @property
    def is_low(self) -> bool:
        threshold = self.low_credit_threshold or 20
        return self.remaining_credits <= threshold

    @property
    def is_exhausted(self) -> bool:
        return self.remaining_credits <= 0


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    credit_id: Mapped[int] = mapped_column(Integer, ForeignKey("usage_credits.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False, default=TransactionType.deduction.value)
    feature: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    credits_used: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_before: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    credit_account: Mapped["UsageCredit"] = relationship("UsageCredit", back_populates="transactions", foreign_keys=[credit_id])
    organization: Mapped["Organization"] = relationship("Organization", foreign_keys=[organization_id])
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])
