from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import HTTPException, status
from app.models.subscription import (
    SubscriptionPlan, TenantSubscription, BillingHistory,
    PlanTier, SubscriptionStatus, BillingInterval,
)
from app.models.organization import Organization
from app.core.log import get_logger
from app.core.tenant import TenantResolver

logger = get_logger("subscription_service")

PLAN_DEFAULTS: dict[str, dict] = {
    "basic": {
        "name": "Basic",
        "description": "Essential features for small teams getting started",
        "price_monthly": 0,
        "price_yearly": 0,
        "max_users": 5,
        "max_tasks": 100,
        "max_ai_queries": 50,
        "max_storage_mb": 100,
        "max_teams": 1,
        "has_analytics": False,
        "has_approvals": False,
        "has_ai_intelligence": False,
        "has_realtime_collaboration": False,
        "has_advanced_analytics": False,
        "has_api_access": False,
        "has_audit_trail": False,
        "has_custom_branding": False,
        "has_priority_support": False,
        "has_sla": False,
        "sort_order": 1,
    },
    "silver": {
        "name": "Silver",
        "description": "Advanced features for growing businesses",
        "price_monthly": 2900,
        "price_yearly": 29000,
        "max_users": 25,
        "max_tasks": 1000,
        "max_ai_queries": 500,
        "max_storage_mb": 500,
        "max_teams": 5,
        "has_analytics": True,
        "has_approvals": True,
        "has_ai_intelligence": False,
        "has_realtime_collaboration": False,
        "has_advanced_analytics": False,
        "has_api_access": True,
        "has_audit_trail": True,
        "has_custom_branding": False,
        "has_priority_support": False,
        "has_sla": False,
        "sort_order": 2,
    },
    "gold": {
        "name": "Gold",
        "description": "Unlimited access with AI intelligence and realtime collaboration",
        "price_monthly": 9900,
        "price_yearly": 99000,
        "max_users": 100,
        "max_tasks": 10000,
        "max_ai_queries": 5000,
        "max_storage_mb": 2000,
        "max_teams": 20,
        "has_analytics": True,
        "has_approvals": True,
        "has_ai_intelligence": True,
        "has_realtime_collaboration": True,
        "has_advanced_analytics": True,
        "has_api_access": True,
        "has_audit_trail": True,
        "has_custom_branding": True,
        "has_priority_support": True,
        "has_sla": True,
        "sort_order": 3,
    },
}


TIER_ORDER = {"basic": 1, "silver": 2, "gold": 3}


class SubscriptionService:

    @staticmethod
    def seed_plans(db: Session) -> list[SubscriptionPlan]:
        plans = []
        for tier, defaults in PLAN_DEFAULTS.items():
            existing = db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.tier == tier))
            if existing:
                for k, v in defaults.items():
                    setattr(existing, k, v)
                plans.append(existing)
            else:
                plan = SubscriptionPlan(tier=tier, **defaults)
                db.add(plan)
                plans.append(plan)
        db.commit()
        for p in plans:
            db.refresh(p)
        logger.info("Seeded %d subscription plans", len(plans))
        return plans

    @staticmethod
    def get_plan_by_tier(db: Session, tier: str) -> Optional[SubscriptionPlan]:
        try:
            tier_enum = PlanTier(tier.lower())
        except ValueError:
            return None
        return db.scalar(select(SubscriptionPlan).where(
            SubscriptionPlan.tier == tier_enum,
            SubscriptionPlan.is_active == True,
        ))

    @staticmethod
    def get_plan_by_id(db: Session, plan_id: int) -> Optional[SubscriptionPlan]:
        return db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))

    @staticmethod
    def list_plans(db: Session) -> list[SubscriptionPlan]:
        return db.execute(select(SubscriptionPlan).where(
            SubscriptionPlan.is_active == True
        ).order_by(SubscriptionPlan.sort_order)).scalars().all()

    @staticmethod
    def get_subscription(db: Session, org_id: int) -> Optional[TenantSubscription]:
        return db.scalar(select(TenantSubscription).where(
            TenantSubscription.organization_id == org_id,
            TenantSubscription.is_active == True,
        ).order_by(TenantSubscription.created_at.desc()))

    @staticmethod
    def get_or_create_subscription(db: Session, org_id: int) -> TenantSubscription:
        sub = SubscriptionService.get_subscription(db, org_id)
        if sub:
            return sub
        basic = SubscriptionService.get_plan_by_tier(db, "basic")
        if not basic:
            SubscriptionService.seed_plans(db)
            basic = SubscriptionService.get_plan_by_tier(db, "basic")
        period_end = datetime.utcnow() + timedelta(days=30)
        sub = TenantSubscription(
            organization_id=org_id,
            plan_id=basic.id,
            status=SubscriptionStatus.active,
            current_period_end=period_end,
            start_date=datetime.utcnow(),
            current_period_start=datetime.utcnow(),
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        logger.info("Auto-created Basic subscription for org_id=%d", org_id)
        return sub

    @staticmethod
    def change_plan(
        db: Session,
        org_id: int,
        target_tier: str,
        billing_interval: str = "monthly",
    ) -> tuple[TenantSubscription, Optional[SubscriptionPlan], SubscriptionPlan]:
        target_plan = SubscriptionService.get_plan_by_tier(db, target_tier)
        if not target_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plan '{target_tier}' not found",
            )

        current_sub = SubscriptionService.get_subscription(db, org_id)
        previous_plan = None
        previous_plan_model = None

        if current_sub:
            previous_plan_model = SubscriptionService.get_plan_by_id(db, current_sub.plan_id)
            current_sub.is_active = False
            current_sub.ended_at = datetime.utcnow()

        interval = BillingInterval.monthly if billing_interval == "monthly" else BillingInterval.yearly
        period_days = 30 if billing_interval == "monthly" else 365
        period_end = datetime.utcnow() + timedelta(days=period_days)

        new_sub = TenantSubscription(
            organization_id=org_id,
            plan_id=target_plan.id,
            status=SubscriptionStatus.active,
            billing_interval=interval,
            start_date=datetime.utcnow(),
            current_period_start=datetime.utcnow(),
            current_period_end=period_end,
            auto_renew=True,
        )
        db.add(new_sub)

        org = db.scalar(select(Organization).where(Organization.id == org_id))
        if org:
            try:
                org.subscription_plan = PlanTier(target_tier)
            except ValueError:
                pass

        event_type = "upgrade" if (previous_plan_model and target_plan.sort_order > previous_plan_model.sort_order) else "downgrade"
        if not previous_plan_model:
            event_type = "activation"

        billing_entry = BillingHistory(
            organization_id=org_id,
            subscription_id=new_sub.id,
            event_type=event_type,
            description=f"Plan changed to {target_plan.name} ({billing_interval})",
            previous_plan_id=previous_plan_model.id if previous_plan_model else None,
            new_plan_id=target_plan.id,
            previous_status=current_sub.status.value if current_sub else None,
            new_status=SubscriptionStatus.active.value,
            amount=target_plan.price_monthly if billing_interval == "monthly" else target_plan.price_yearly,
            interval=billing_interval,
            period_start=new_sub.current_period_start,
            period_end=new_sub.current_period_end,
        )
        db.add(billing_entry)
        db.commit()
        db.refresh(new_sub)

        TenantResolver.invalidate_cache(org_id)
        if org:
            TenantResolver.invalidate_cache(org.slug)

        logger.info("Plan change for org_id=%d: %s -> %s", org_id,
                     previous_plan_model.name if previous_plan_model else "none", target_plan.name)
        return new_sub, previous_plan_model, target_plan

    @staticmethod
    def cancel_subscription(
        db: Session,
        org_id: int,
        reason: Optional[str] = None,
        immediate: bool = False,
    ) -> TenantSubscription:
        sub = SubscriptionService.get_subscription(db, org_id)
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active subscription found")
        if sub.status == SubscriptionStatus.canceled:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subscription already canceled")

        sub.status = SubscriptionStatus.canceled
        sub.canceled_at = datetime.utcnow()
        sub.auto_renew = False

        if immediate:
            sub.ended_at = datetime.utcnow()
            sub.is_active = False
            period_end = datetime.utcnow()
        else:
            period_end = sub.current_period_end

        billing_entry = BillingHistory(
            organization_id=org_id,
            subscription_id=sub.id,
            event_type="canceled",
            description=reason or "Subscription canceled",
            previous_status=SubscriptionStatus.active.value,
            new_status=SubscriptionStatus.canceled.value,
            period_end=period_end,
        )
        db.add(billing_entry)
        db.commit()
        db.refresh(sub)
        logger.info("Subscription canceled for org_id=%d (immediate=%s)", org_id, immediate)
        return sub

    @staticmethod
    def get_billing_history(
        db: Session,
        org_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[BillingHistory]:
        return db.execute(select(BillingHistory).where(
            BillingHistory.organization_id == org_id,
        ).order_by(BillingHistory.created_at.desc()).offset(skip).limit(limit)).scalars().all()

    @staticmethod
    def check_feature_access(db: Session, org_id: int, feature: str) -> bool:
        sub = SubscriptionService.get_or_create_subscription(db, org_id)
        plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
        if not plan:
            return False
        feature_map = {
            "analytics": plan.has_analytics,
            "approvals": plan.has_approvals,
            "ai_intelligence": plan.has_ai_intelligence,
            "realtime_collaboration": plan.has_realtime_collaboration,
            "advanced_analytics": plan.has_advanced_analytics,
            "api_access": plan.has_api_access,
            "audit_trail": plan.has_audit_trail,
            "custom_branding": plan.has_custom_branding,
            "priority_support": plan.has_priority_support,
            "sla": plan.has_sla,
        }
        result = feature_map.get(feature)
        if result is not None:
            return result
        from app.core.feature_registry import FeatureRegistry, TIER_ORDER
        current_tier = plan.tier.value if hasattr(plan.tier, "value") else plan.tier
        feature_def = FeatureRegistry.get(feature)
        if feature_def:
            return TIER_ORDER.get(current_tier, 0) >= feature_def.required_level
        return False

    @staticmethod
    def get_usage_counts(db: Session, org_id: int) -> dict:
        from app.models.user import User
        from app.models.task import Task
        current_users = db.scalar(select(func.count(User.id)).where(User.tenant_id == org_id, User.is_active == True))
        current_tasks = db.scalar(select(func.count(Task.id)).where(Task.tenant_id == org_id))
        current_storage_mb = db.scalar(select(func.count(Task.id)).where(Task.tenant_id == org_id)) * 0.1
        return {
            "users": current_users,
            "tasks": current_tasks,
            "storage_mb": round(current_storage_mb, 1),
        }

    @staticmethod
    def check_limits(db: Session, org_id: int) -> dict:
        sub = SubscriptionService.get_or_create_subscription(db, org_id)
        plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
        if not plan:
            return {"allowed": True}
        usage = SubscriptionService.get_usage_counts(db, org_id)
        limits_exceeded = []
        if usage["users"] >= plan.max_users:
            limits_exceeded.append("users")
        if usage["tasks"] >= plan.max_tasks:
            limits_exceeded.append("tasks")
        if usage["storage_mb"] >= plan.max_storage_mb:
            limits_exceeded.append("storage")
        return {
            "allowed": len(limits_exceeded) == 0,
            "limits_exceeded": limits_exceeded,
            "usage": usage,
            "limits": {
                "max_users": plan.max_users,
                "max_tasks": plan.max_tasks,
                "max_storage_mb": plan.max_storage_mb,
                "max_ai_queries": plan.max_ai_queries,
            },
        }

    @staticmethod
    def require_feature(feature: str):
        def checker(
            db: Session,
            org_id: int,
        ):
            if not SubscriptionService.check_feature_access(db, org_id, feature):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Feature '{feature}' requires a higher subscription plan. Upgrade to Silver or Gold.",
                )
            return True
        return checker

    @staticmethod
    def enforce_usage_limits(db: Session, org_id: int) -> None:
        limits = SubscriptionService.check_limits(db, org_id)
        if not limits["allowed"]:
            exceeded = ", ".join(limits["limits_exceeded"])
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Usage limit exceeded: {exceeded}. Upgrade your plan for higher limits.",
            )

    @staticmethod
    def get_subscription_details(db: Session, org_id: int) -> dict:
        sub = SubscriptionService.get_or_create_subscription(db, org_id)
        plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
        usage = SubscriptionService.get_usage_counts(db, org_id)
        limits = SubscriptionService.check_limits(db, org_id)
        return {
            "subscription": sub,
            "plan": plan,
            "usage": usage,
            "limits": limits,
        }
