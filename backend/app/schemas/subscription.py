from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SubscriptionPlanResponse(BaseModel):
    id: int
    tier: str
    name: str
    description: Optional[str] = None
    price_monthly: int
    price_yearly: int
    max_users: int
    max_tasks: int
    max_ai_queries: int
    max_storage_mb: int
    max_teams: int
    has_analytics: bool
    has_approvals: bool
    has_ai_intelligence: bool
    has_realtime_collaboration: bool
    has_advanced_analytics: bool
    has_api_access: bool
    has_audit_trail: bool
    has_custom_branding: bool
    has_priority_support: bool
    has_sla: bool
    features_json: Optional[dict] = None
    is_active: bool
    sort_order: int

    model_config = {"from_attributes": True}


class TenantSubscriptionResponse(BaseModel):
    id: int
    organization_id: int
    plan_id: int
    plan: Optional[SubscriptionPlanResponse] = None
    status: str
    billing_interval: str
    start_date: datetime
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    auto_renew: bool
    is_active: bool
    is_expired: bool = False
    days_remaining: int = 0
    on_trial: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionUpgradeRequest(BaseModel):
    plan_tier: str = Field(..., description="Target plan tier: basic, silver, or gold")
    billing_interval: str = Field(default="monthly", pattern=r"^(monthly|yearly)$")


class SubscriptionUpgradeResponse(BaseModel):
    subscription: TenantSubscriptionResponse
    previous_plan: Optional[SubscriptionPlanResponse] = None
    new_plan: SubscriptionPlanResponse
    message: str


class BillingHistoryResponse(BaseModel):
    id: int
    organization_id: int
    subscription_id: Optional[int] = None
    event_type: str
    description: Optional[str] = None
    previous_plan_id: Optional[int] = None
    new_plan_id: Optional[int] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    amount: int = 0
    currency: str = "USD"
    interval: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    invoice_url: Optional[str] = None
    receipt_url: Optional[str] = None
    payment_method: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionCancelRequest(BaseModel):
    reason: Optional[str] = None
    immediate: bool = False


class SubscriptionCancelResponse(BaseModel):
    subscription: TenantSubscriptionResponse
    message: str
    effective_date: Optional[datetime] = None


class FeatureAccessResponse(BaseModel):
    plan_tier: str
    limits: dict
    features: dict
    usage: dict
