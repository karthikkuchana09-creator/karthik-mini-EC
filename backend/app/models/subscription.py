from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
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

    id = Column(Integer, primary_key=True, index=True)
    tier = Column(SAEnum(PlanTier), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price_monthly = Column(Integer, default=0)
    price_yearly = Column(Integer, default=0)

    max_users = Column(Integer, default=5)
    max_tasks = Column(Integer, default=100)
    max_ai_queries = Column(Integer, default=50)
    max_storage_mb = Column(Integer, default=100)
    max_teams = Column(Integer, default=1)

    has_analytics = Column(Boolean, default=False)
    has_approvals = Column(Boolean, default=False)
    has_ai_intelligence = Column(Boolean, default=False)
    has_realtime_collaboration = Column(Boolean, default=False)
    has_advanced_analytics = Column(Boolean, default=False)
    has_api_access = Column(Boolean, default=False)
    has_audit_trail = Column(Boolean, default=False)
    has_custom_branding = Column(Boolean, default=False)
    has_priority_support = Column(Boolean, default=False)
    has_sla = Column(Boolean, default=False)

    features_json = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    subscriptions = relationship("TenantSubscription", back_populates="plan")


class TenantSubscription(Base):
    __tablename__ = "tenant_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    plan_id = Column(Integer, ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(SAEnum(SubscriptionStatus), default=SubscriptionStatus.active, nullable=False)
    billing_interval = Column(SAEnum(BillingInterval), default=BillingInterval.monthly)

    start_date = Column(DateTime, server_default=func.now(), nullable=False)
    current_period_start = Column(DateTime, server_default=func.now(), nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    trial_end = Column(DateTime, nullable=True)
    canceled_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    auto_renew = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    metadata_json = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    plan = relationship("SubscriptionPlan", back_populates="subscriptions", foreign_keys=[plan_id])

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

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("tenant_subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)

    event_type = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)

    previous_plan_id = Column(Integer, nullable=True)
    new_plan_id = Column(Integer, nullable=True)

    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)

    amount = Column(Integer, default=0)
    currency = Column(String(3), default="USD")
    interval = Column(String(20), nullable=True)
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)

    invoice_url = Column(String(500), nullable=True)
    receipt_url = Column(String(500), nullable=True)
    payment_method = Column(String(50), nullable=True)

    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    organization_id_index = "ix_billing_history_org_id"
