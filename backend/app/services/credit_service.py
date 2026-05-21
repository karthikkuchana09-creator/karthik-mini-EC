from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.credit import UsageCredit, CreditTransaction, TransactionType
from app.core.log import get_logger

logger = get_logger("credit_service")

CREDIT_COSTS: dict[str, int] = {
    "ai_suggestion": 10,
    "ai_summary": 5,
    "ai_analytics_dashboard": 15,
    "ai_performance_analytics": 10,
    "ai_recommendation": 5,
    "ai_high_priority": 3,
    "ai_assignment_recommend": 5,
    "ai_workload_analysis": 8,
    "ai_delay_prediction": 8,
    "ai_employee_productivity": 8,
    "ai_team_intelligence": 12,
    "ai_history": 2,
    "document_upload_per_mb": 2,
    "analytics_generation": 5,
    "api_call": 1,
    "data_export": 3,
}

PLAN_CREDIT_ALLOCATIONS: dict[str, int] = {
    "basic": 100,
    "silver": 1000,
    "gold": 10000,
}


class CreditService:

    @staticmethod
    def get_or_create_account(db: Session, org_id: int) -> UsageCredit:
        account = db.query(UsageCredit).filter(
            UsageCredit.organization_id == org_id,
        ).first()
        if account:
            return account

        from app.services.subscription_service import SubscriptionService
        sub = SubscriptionService.get_or_create_subscription(db, org_id)
        plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
        current_tier = plan.tier.value if hasattr(plan.tier, "value") else plan.tier
        allocation = PLAN_CREDIT_ALLOCATIONS.get(current_tier, 100)

        account = UsageCredit(
            organization_id=org_id,
            total_credits=allocation,
            remaining_credits=allocation,
            used_credits=0,
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        logger.info("Created credit account for org_id=%d with %d credits", org_id, allocation)
        return account

    @staticmethod
    def get_balance(db: Session, org_id: int) -> UsageCredit:
        return CreditService.get_or_create_account(db, org_id)

    @staticmethod
    def deduct_credits(
        db: Session,
        org_id: int,
        feature: str,
        credits: int,
        description: Optional[str] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> CreditTransaction:
        account = CreditService.get_or_create_account(db, org_id)

        if account.remaining_credits < credits:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"Insufficient credits for '{feature}'. "
                    f"Required: {credits}, Available: {account.remaining_credits}. "
                    f"Purchase more credits or upgrade your plan."
                ),
                headers={
                    "X-Credits-Required": str(credits),
                    "X-Credits-Available": str(account.remaining_credits),
                    "X-Credits-Short": str(credits - account.remaining_credits),
                },
            )

        balance_before = account.remaining_credits
        account.used_credits += credits
        account.remaining_credits -= credits

        if account.is_low and not account.low_credit_alert_sent:
            account.low_credit_alert_sent = True
            logger.warning(
                "Low credits for org_id=%d: %d/%d remaining (%.1f%%)",
                org_id, account.remaining_credits, account.total_credits, account.usage_pct,
            )

        transaction = CreditTransaction(
            credit_id=account.id,
            organization_id=org_id,
            transaction_type=TransactionType.deduction.value,
            feature=feature,
            credits_used=credits,
            balance_before=balance_before,
            balance_after=account.remaining_credits,
            description=description or f"Credits used for {feature}",
            reference_type=reference_type,
            reference_id=reference_id,
            user_id=user_id,
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        logger.debug(
            "Deducted %d credits for org_id=%d feature=%s (remaining: %d/%d)",
            credits, org_id, feature, account.remaining_credits, account.total_credits,
        )
        return transaction

    @staticmethod
    def deduct(
        db: Session,
        org_id: int,
        feature: str,
        user_id: Optional[int] = None,
        reference_id: Optional[int] = None,
    ) -> Optional[CreditTransaction]:
        cost = CREDIT_COSTS.get(feature)
        if cost is None:
            logger.warning("No credit cost defined for feature '%s'", feature)
            return None
        return CreditService.deduct_credits(
            db=db,
            org_id=org_id,
            feature=feature,
            credits=cost,
            description=f"Auto-deducted {cost} credits for {feature}",
            reference_type=feature,
            reference_id=reference_id,
            user_id=user_id,
        )

    @staticmethod
    def add_credits(
        db: Session,
        org_id: int,
        credits: int,
        transaction_type: str = TransactionType.purchase.value,
        description: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> CreditTransaction:
        account = CreditService.get_or_create_account(db, org_id)
        balance_before = account.remaining_credits
        account.total_credits += credits
        account.remaining_credits += credits

        if account.low_credit_alert_sent and account.remaining_credits > account.low_credit_threshold:
            account.low_credit_alert_sent = False

        transaction = CreditTransaction(
            credit_id=account.id,
            organization_id=org_id,
            transaction_type=transaction_type,
            feature="purchase",
            credits_used=-credits,
            balance_before=balance_before,
            balance_after=account.remaining_credits,
            description=description or f"Added {credits} credits",
            user_id=user_id,
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        logger.info("Added %d credits to org_id=%d (total: %d)", credits, org_id, account.total_credits)
        return transaction

    @staticmethod
    def reset_monthly_credits(db: Session, org_id: int) -> UsageCredit:
        account = CreditService.get_or_create_account(db, org_id)

        from app.services.subscription_service import SubscriptionService
        sub = SubscriptionService.get_or_create_subscription(db, org_id)
        plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
        current_tier = plan.tier.value if hasattr(plan.tier, "value") else plan.tier
        allocation = PLAN_CREDIT_ALLOCATIONS.get(current_tier, 100)

        balance_before = account.remaining_credits
        account.total_credits = allocation
        account.used_credits = 0
        account.remaining_credits = allocation
        account.last_reset_at = datetime.utcnow()
        account.low_credit_alert_sent = False

        transaction = CreditTransaction(
            credit_id=account.id,
            organization_id=org_id,
            transaction_type=TransactionType.reset.value,
            feature="monthly_reset",
            credits_used=balance_before,
            balance_before=balance_before,
            balance_after=allocation,
            description=f"Monthly credit reset: {balance_before} -> {allocation}",
        )
        db.add(transaction)
        db.commit()
        db.refresh(account)
        logger.info("Reset credits for org_id=%d: %d -> %d", org_id, balance_before, allocation)
        return account

    @staticmethod
    def get_transactions(
        db: Session,
        org_id: int,
        skip: int = 0,
        limit: int = 50,
        feature: Optional[str] = None,
    ) -> list[CreditTransaction]:
        q = db.query(CreditTransaction).filter(
            CreditTransaction.organization_id == org_id,
        )
        if feature:
            q = q.filter(CreditTransaction.feature == feature)
        return q.order_by(CreditTransaction.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def check_credits(db: Session, org_id: int, feature: str) -> bool:
        cost = CREDIT_COSTS.get(feature)
        if cost is None:
            return True
        account = CreditService.get_or_create_account(db, org_id)
        return account.remaining_credits >= cost

    @staticmethod
    def get_credit_summary(db: Session, org_id: int) -> dict:
        account = CreditService.get_or_create_account(db, org_id)
        recent = db.query(CreditTransaction).filter(
            CreditTransaction.organization_id == org_id,
        ).order_by(CreditTransaction.created_at.desc()).limit(5).all()

        feature_breakdown = db.query(
            CreditTransaction.feature,
            func.sum(CreditTransaction.credits_used).label("total_used"),
            func.count(CreditTransaction.id).label("count"),
        ).filter(
            CreditTransaction.organization_id == org_id,
            CreditTransaction.transaction_type == TransactionType.deduction.value,
        ).group_by(CreditTransaction.feature).all()

        return {
            "total_credits": account.total_credits,
            "used_credits": account.used_credits,
            "remaining_credits": account.remaining_credits,
            "usage_pct": account.usage_pct,
            "is_low": account.is_low,
            "is_exhausted": account.is_exhausted,
            "low_credit_threshold": account.low_credit_threshold,
            "recent_transactions": [
                {
                    "id": t.id,
                    "feature": t.feature,
                    "transaction_type": t.transaction_type,
                    "credits_used": t.credits_used,
                    "balance_after": t.balance_after,
                    "description": t.description,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in recent
            ],
            "feature_breakdown": [
                {
                    "feature": f.feature,
                    "total_used": int(f.total_used),
                    "count": f.count,
                }
                for f in feature_breakdown
            ],
        }
