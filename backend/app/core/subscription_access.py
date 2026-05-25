from typing import Optional, Callable
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.tenant import get_current_tenant_id, require_active_tenant
from app.models.user import User
from app.services.subscription_service import SubscriptionService
from app.core.feature_registry import FeatureRegistry, TIER_ORDER

TIER_LABELS = {"basic": "Basic", "silver": "Silver", "gold": "Gold"}


def _resolve_org_id(request: Request, user: User) -> int:
    org_id = user.tenant_id or get_current_tenant_id(request)
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No organization context found",
        )
    return org_id


class require_feature:
    def __init__(self, feature: str):
        self.feature = feature

    def __call__(
        self,
        request: Request,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        org_id = _resolve_org_id(request, user)
        has_access = SubscriptionService.check_feature_access(db, org_id, self.feature)
        if not has_access:
            feature_def = FeatureRegistry.get(self.feature)
            required_tier = feature_def.required_tier if feature_def else "silver"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Your current plan does not support '{feature_def.label if feature_def else self.feature}'. "
                    f"This feature requires at least the '{TIER_LABELS[required_tier]}' plan. "
                    f"Upgrade to access this feature."
                ),
                headers={
                    "X-Upgrade-Required": "true",
                    "X-Required-Plan": required_tier,
                },
            )
        return True


class require_plan:
    def __init__(self, min_tier: str):
        self.min_tier = min_tier

    async def __call__(
        self,
        request: Request,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        org_id = _resolve_org_id(request, user)
        sub = SubscriptionService.get_or_create_subscription(db, org_id)
        plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
        if not plan:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active plan found")
        current_tier = plan.tier.value if hasattr(plan.tier, "value") else plan.tier
        current_level = TIER_ORDER.get(current_tier, 0)
        required_level = TIER_ORDER.get(self.min_tier, 0)
        if current_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"This action requires at least the '{TIER_LABELS.get(self.min_tier, self.min_tier)}' plan. "
                    f"Your current plan is '{plan.name}'."
                ),
                headers={
                    "X-Upgrade-Required": "true",
                    "X-Required-Plan": self.min_tier,
                    "X-Current-Plan": current_tier,
                },
            )
        return True


def enforce_usage_limits(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _resolve_org_id(request, user)
    limits = SubscriptionService.check_limits(db, org_id)
    if not limits["allowed"]:
        exceeded = ", ".join(limits["limits_exceeded"])
        current_usage = limits["usage"]
        plan_limits = limits["limits"]
        detail_parts = [f"Usage limit exceeded: {exceeded}."]
        for resource in limits["limits_exceeded"]:
            detail_parts.append(
                f"{resource.capitalize()}: {current_usage.get(resource, '?')} / {plan_limits.get(f'max_{resource}', '?')} used"
            )
        detail_parts.append("Upgrade your plan for higher limits.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=" ".join(detail_parts),
            headers={"X-Limit-Exceeded": ",".join(limits["limits_exceeded"])},
        )
    return True


def require_quota(resource: str):
    def check_quota(
        request: Request,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        org_id = _resolve_org_id(request, user)
        limits = SubscriptionService.check_limits(db, org_id)
        plan_limits = limits["limits"]
        usage = limits["usage"]
        resource_limit_map = {
            "users": ("max_users", usage.get("users", 0)),
            "tasks": ("max_tasks", usage.get("tasks", 0)),
            "storage": ("max_storage_mb", usage.get("storage_mb", 0)),
            "ai_queries": ("max_ai_queries", 0),
        }
        if resource not in resource_limit_map:
            return True
        limit_key, current = resource_limit_map[resource]
        max_val = plan_limits.get(limit_key, 0)
        if current >= max_val:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{resource.capitalize()} quota exhausted ({current}/{max_val}). Upgrade your plan.",
                headers={"X-Quota-Resource": resource, "X-Quota-Used": str(current), "X-Quota-Max": str(max_val)},
            )
        return True
    return check_quota


def require_subscription_active(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _resolve_org_id(request, user)
    sub = SubscriptionService.get_or_create_subscription(db, org_id)
    if sub.is_expired:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your subscription has expired. Please renew to continue using the service.",
            headers={"X-Subscription-Expired": "true", "X-Days-Overdue": str(abs(sub.days_remaining))},
        )
    if sub.status.value in ("canceled", "expired"):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Your subscription is {sub.status.value}. Please reactivate to continue.",
            headers={"X-Subscription-Status": str(sub.status.value)},
        )
    return True


def check_create_limit(resource: str):
    def checker(
        request: Request,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        org_id = _resolve_org_id(request, user)
        current = 0
        max_val = 0
        from app.models.task import Task
        from app.models.user import User as UserModel
        sub = SubscriptionService.get_or_create_subscription(db, org_id)
        plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
        if not plan:
            return True
        if resource == "users":
            current = db.scalar(select(func.count()).select_from(select(UserModel).where(UserModel.tenant_id == org_id, UserModel.is_active == True).subquery()))
            max_val = plan.max_users
        elif resource == "tasks":
            current = db.scalar(select(func.count()).select_from(select(Task).where(Task.tenant_id == org_id).subquery()))
            max_val = plan.max_tasks
        elif resource == "teams":
            max_val = plan.max_teams
        if current >= max_val:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{resource.capitalize()} limit reached ({current}/{max_val}). Upgrade your plan to create more.",
                headers={"X-Limit-Resource": resource, "X-Limit-Current": str(current), "X-Limit-Max": str(max_val)},
            )
        return True
    return checker


def get_effective_plan(request: Request, db: Session, user: User):
    org_id = _resolve_org_id(request, user)
    sub = SubscriptionService.get_or_create_subscription(db, org_id)
    plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
    return plan


def get_feature_state(request: Request, db: Session, user: User, feature: str) -> bool:
    org_id = _resolve_org_id(request, user)
    return SubscriptionService.check_feature_access(db, org_id, feature)


def get_available_features(request: Request, db: Session, user: User) -> list[str]:
    org_id = _resolve_org_id(request, user)
    sub = SubscriptionService.get_or_create_subscription(db, org_id)
    plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
    if not plan:
        return []
    current_tier = plan.tier.value if hasattr(plan.tier, "value") else plan.tier
    return FeatureRegistry.features_for_tier(current_tier)


def filter_response_by_plan(data: dict, request: Request, db: Session, user: User) -> dict:
    available = get_available_features(request, db, user)
    forbidden_keys = {
        "ai_summary", "ai_insights", "predictions",
        "realtime_updates", "websocket_url",
        "advanced_analytics", "performance_predictions",
        "team_intelligence", "delay_forecast",
    }
    return {k: v for k, v in data.items() if k not in forbidden_keys or k in available}
