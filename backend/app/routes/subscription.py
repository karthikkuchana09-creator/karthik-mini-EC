from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.routes.deps import get_db, get_current_user
from app.core.tenant import require_active_tenant
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionPlanResponse,
    SubscriptionUpgradeRequest,
    SubscriptionUpgradeResponse,
    SubscriptionCancelRequest,
    SubscriptionCancelResponse,
    BillingHistoryResponse,
    FeatureAccessResponse,
)
from app.repository.subscription_repository import list_all_plans, list_billing_history
from app.services.subscription_service import SubscriptionService
from app.services.usage_analytics_service import UsageAnalyticsService
from app.core.log import get_logger

logger = get_logger("subscription_api")
router = APIRouter(prefix="/subscription", tags=["Subscription"])


@router.get("/plans", response_model=Page[SubscriptionPlanResponse])
def list_plans(
    db: Session = Depends(get_db),
):
    """List all available subscription plans with features and pricing."""
    return list_all_plans(db)


@router.get("/plans/{tier}", response_model=SubscriptionPlanResponse)
def get_plan(
    tier: str,
    db: Session = Depends(get_db),
):
    """Get details for a specific plan tier."""
    plan = SubscriptionService.get_plan_by_tier(db, tier)
    if not plan:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan '{tier}' not found")
    return plan


@router.get("/current")
def get_current_subscription(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the current active subscription with billing insights for the authenticated user's organization."""
    org_id = user.tenant_id or require_active_tenant(request)
    return UsageAnalyticsService.get_subscription_current(db, org_id)


@router.post("/upgrade", response_model=SubscriptionUpgradeResponse)
def upgrade_subscription(
    body: SubscriptionUpgradeRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upgrade or downgrade to a different plan tier."""
    org_id = user.tenant_id or require_active_tenant(request)
    new_sub, prev_plan, new_plan = SubscriptionService.change_plan(
        db, org_id, body.plan_tier, body.billing_interval,
    )
    return SubscriptionUpgradeResponse(
        subscription=new_sub,
        previous_plan=prev_plan,
        new_plan=new_plan,
        message=f"Successfully {'upgraded' if prev_plan and new_plan.sort_order > prev_plan.sort_order else 'downgraded'} to {new_plan.name}",
    )


@router.post("/cancel", response_model=SubscriptionCancelResponse)
def cancel_subscription(
    body: SubscriptionCancelRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Cancel the current subscription."""
    org_id = user.tenant_id or require_active_tenant(request)
    sub = SubscriptionService.cancel_subscription(db, org_id, body.reason, body.immediate)
    return SubscriptionCancelResponse(
        subscription=sub,
        message="Subscription has been canceled",
        effective_date=sub.ended_at or sub.current_period_end,
    )


@router.get("/billing", response_model=Page[BillingHistoryResponse])
def get_billing_history(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get billing history for the organization."""
    org_id = user.tenant_id or require_active_tenant(request)
    return list_billing_history(db, org_id)


@router.get("/features", response_model=FeatureAccessResponse)
def get_feature_access(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get feature access, limits, and usage for the current organization."""
    org_id = user.tenant_id or require_active_tenant(request)
    details = SubscriptionService.get_subscription_details(db, org_id)
    plan = details["plan"]
    usage = details["usage"]
    limits_info = details["limits"]
    return FeatureAccessResponse(
        plan_tier=plan.tier.value if hasattr(plan.tier, "value") else plan.tier,
        limits=limits_info["limits"],
        features={
            "analytics": plan.has_analytics,
            "approvals": plan.has_approvals,
            "ai_intelligence": plan.has_ai_intelligence,
            "realtime_collaboration": plan.has_realtime_collaboration,
            "advanced_analytics": plan.has_advanced_analytics,
            "api_access": plan.has_api_access,
            "audit_trail": plan.has_audit_trail,
            "custom_branding": plan.has_custom_branding,
            "priority_support": plan.has_priority_support,
        },
        usage=usage,
    )


@router.post("/refresh")
def refresh_subscription_status(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Check and update subscription status (expiry, past-due)."""
    org_id = user.tenant_id or require_active_tenant(request)
    sub = SubscriptionService.get_or_create_subscription(db, org_id)
    if sub.is_expired and sub.status.value == "active":
        sub.status = "expired"
        db.commit()
        return {"status": "expired", "message": "Subscription has expired. Please renew."}
    return {
        "status": sub.status.value if hasattr(sub.status, "value") else sub.status,
        "days_remaining": sub.days_remaining,
        "on_trial": sub.on_trial,
        "auto_renew": sub.auto_renew,
    }
