from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base


class PlanTier(str, enum.Enum):
    basic = "basic"
    silver = "silver"
    gold = "gold"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    trialing = "trialing"
    past_due = "past_due"
    canceled = "canceled"
    expired = "expired"


class BillingInterval(str, enum.Enum):
    monthly = "monthly"
    yearly = "yearly"


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tier: Mapped[PlanTier] = mapped_column(SAEnum(PlanTier), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_monthly: Mapped[int] = mapped_column(Integer, default=0)
    price_yearly: Mapped[int] = mapped_column(Integer, default=0)

    max_users: Mapped[int] = mapped_column(Integer, default=5)
    max_tasks: Mapped[int] = mapped_column(Integer, default=100)
    max_ai_queries: Mapped[int] = mapped_column(Integer, default=50)
    max_storage_mb: Mapped[int] = mapped_column(Integer, default=100)
    max_teams: Mapped[int] = mapped_column(Integer, default=1)

    has_analytics: Mapped[bool] = mapped_column(Boolean, default=False)
    has_approvals: Mapped[bool] = mapped_column(Boolean, default=False)
    has_ai_intelligence: Mapped[bool] = mapped_column(Boolean, default=False)
    has_realtime_collaboration: Mapped[bool] = mapped_column(Boolean, default=False)
    has_advanced_analytics: Mapped[bool] = mapped_column(Boolean, default=False)
    has_api_access: Mapped[bool] = mapped_column(Boolean, default=False)
    has_audit_trail: Mapped[bool] = mapped_column(Boolean, default=False)
    has_custom_branding: Mapped[bool] = mapped_column(Boolean, default=False)
    has_priority_support: Mapped[bool] = mapped_column(Boolean, default=False)
    has_sla: Mapped[bool] = mapped_column(Boolean, default=False)

    features_json: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    subscriptions: Mapped[list["TenantSubscription"]] = relationship("TenantSubscription", back_populates="plan")


class TenantSubscription(Base):
    __tablename__ = "tenant_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False, index=True)
    status: Mapped[SubscriptionStatus] = mapped_column(SAEnum(SubscriptionStatus), default=SubscriptionStatus.active, nullable=False)
    billing_interval: Mapped[BillingInterval] = mapped_column(SAEnum(BillingInterval), default=BillingInterval.monthly)

    start_date: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    current_period_start: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    trial_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    canceled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    plan: Mapped["SubscriptionPlan"] = relationship("SubscriptionPlan", back_populates="subscriptions", foreign_keys=[plan_id])

    @property
    def is_expired(self) -> bool:
        from datetime import datetime
        if self.current_period_end and datetime.utcnow() > self.current_period_end:
            return True
        return False

    @property
    def days_remaining(self) -> int:
        from datetime import datetime
        if not self.current_period_end:
            return 0
        delta = self.current_period_end - datetime.utcnow()
        return max(0, delta.days)

    @property
    def on_trial(self) -> bool:
        from datetime import datetime
        if self.trial_end and datetime.utcnow() < self.trial_end:
            return True
        return False


class BillingHistory(Base):
    __tablename__ = "billing_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tenant_subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)

    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    previous_plan_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    new_plan_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    previous_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    amount: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    interval: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    period_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    period_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    invoice_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    organization_id_index = "ix_billing_history_org_id"
