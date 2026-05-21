from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
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

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    total_credits = Column(Integer, default=100, nullable=False)
    used_credits = Column(Integer, default=0, nullable=False)
    remaining_credits = Column(Integer, default=100, nullable=False)

    low_credit_threshold = Column(Integer, default=20)
    low_credit_alert_sent = Column(Boolean, default=False)

    last_reset_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    transactions = relationship("CreditTransaction", back_populates="credit_account", foreign_keys="CreditTransaction.credit_id")

    @property
    def usage_pct(self) -> float:
        if self.total_credits == 0:
            return 0.0
        return round((self.used_credits / self.total_credits) * 100, 1)

    @property
    def is_low(self) -> bool:
        return self.remaining_credits <= self.low_credit_threshold

    @property
    def is_exhausted(self) -> bool:
        return self.remaining_credits <= 0


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    credit_id = Column(Integer, ForeignKey("usage_credits.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    transaction_type = Column(String(20), nullable=False, default=TransactionType.deduction.value)
    feature = Column(String(100), nullable=False, index=True)
    credits_used = Column(Integer, nullable=False)
    balance_before = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)

    description = Column(Text, nullable=True)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)
    metadata_json = Column(Text, nullable=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    credit_account = relationship("UsageCredit", back_populates="transactions", foreign_keys=[credit_id])
    organization = relationship("Organization", foreign_keys=[organization_id])
    user = relationship("User", foreign_keys=[user_id])
