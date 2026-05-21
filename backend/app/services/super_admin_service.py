from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from app.core.log import get_logger
from app.models.invoice import Invoice, InvoiceStatus
from app.models.organization import Organization, SubscriptionPlanEnum
from app.models.subscription import TenantSubscription, SubscriptionStatus, SubscriptionPlan
from app.models.user import User
from app.models.credit import CreditTransaction, UsageCredit
from app.models.payment import RazorpayPayment, PaymentStatus
from app.models.ai import AIAnalysis

logger = get_logger("super_admin")


class SuperAdminService:

    @staticmethod
    def get_org_overview(db: Session) -> dict:
        total = db.query(func.count(Organization.id)).scalar() or 0
        active = db.query(func.count(Organization.id)).filter(
            Organization.is_active == True,
            Organization.suspended_at.is_(None),
        ).scalar() or 0
        suspended = db.query(func.count(Organization.id)).filter(
            Organization.suspended_at.isnot(None),
        ).scalar() or 0

        return {"total": total, "active": active, "suspended": suspended}

    @staticmethod
    def get_org_signups(db: Session, days: int = 30) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        results = db.query(
            func.date(Organization.created_at).label("date"),
            func.count(Organization.id).label("count"),
        ).filter(
            Organization.created_at >= cutoff,
        ).group_by(
            func.date(Organization.created_at),
        ).order_by(
            func.date(Organization.created_at),
        ).all()

        return [
            {"date": str(row.date), "count": row.count}
            for row in results
        ]

    @staticmethod
    def get_plan_distribution(db: Session) -> list[dict]:
        results = db.query(
            Organization.subscription_plan,
            func.count(Organization.id).label("count"),
        ).group_by(Organization.subscription_plan).order_by(
            func.count(Organization.id).desc(),
        ).all()

        return [
            {"plan": row.subscription_plan.value if hasattr(row.subscription_plan, 'value') else str(row.subscription_plan), "count": row.count}
            for row in results
        ]

    @staticmethod
    def get_revenue_summary(db: Session) -> dict:
        paid = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
            Invoice.status == InvoiceStatus.paid.value,
        ).scalar()

        period_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        current_mrr = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
            Invoice.status == InvoiceStatus.paid.value,
            Invoice.paid_date >= period_start,
        ).scalar()

        paid_count = db.query(func.count(Invoice.id)).filter(
            Invoice.status == InvoiceStatus.paid.value,
        ).scalar()

        return {
            "total_revenue": int(paid or 0),
            "total_revenue_inr": round((paid or 0) / 100, 2),
            "current_mrr": int(current_mrr or 0),
            "current_mrr_inr": round((current_mrr or 0) / 100, 2),
            "current_arr": int((current_mrr or 0) * 12),
            "current_arr_inr": round((current_mrr or 0) * 12 / 100, 2),
            "paid_invoices_count": paid_count or 0,
            "currency": "INR",
        }

    @staticmethod
    def get_revenue_by_month(db: Session, months: int = 12) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(days=months * 31)
        results = db.query(
            extract("year", Invoice.paid_date).label("year"),
            extract("month", Invoice.paid_date).label("month"),
            func.coalesce(func.sum(Invoice.total_amount), 0).label("amount"),
            func.count(Invoice.id).label("count"),
        ).filter(
            Invoice.status == InvoiceStatus.paid.value,
            Invoice.paid_date >= cutoff,
        ).group_by(
            extract("year", Invoice.paid_date),
            extract("month", Invoice.paid_date),
        ).order_by(
            extract("year", Invoice.paid_date),
            extract("month", Invoice.paid_date),
        ).all()

        return [
            {
                "period": f"{int(row.year)}-{int(row.month):02d}",
                "amount": int(row.amount),
                "count": row.count,
            }
            for row in results
        ]

    @staticmethod
    def get_subscription_overview(db: Session) -> dict:
        total_subs = db.query(func.count(TenantSubscription.id)).scalar() or 0
        active_subs = db.query(func.count(TenantSubscription.id)).filter(
            TenantSubscription.status == SubscriptionStatus.active.value,
        ).scalar() or 0
        trialing = db.query(func.count(TenantSubscription.id)).filter(
            TenantSubscription.status == SubscriptionStatus.trialing.value,
        ).scalar() or 0
        past_due = db.query(func.count(TenantSubscription.id)).filter(
            TenantSubscription.status == SubscriptionStatus.past_due.value,
        ).scalar() or 0
        canceled = db.query(func.count(TenantSubscription.id)).filter(
            TenantSubscription.status == SubscriptionStatus.canceled.value,
        ).scalar() or 0

        tier_distribution = db.query(
            TenantSubscription.status,
            func.count(TenantSubscription.id).label("count"),
        ).group_by(TenantSubscription.status).all()

        plan_distribution = db.query(
            SubscriptionPlan.tier,
            func.count(TenantSubscription.id).label("count"),
        ).join(
            TenantSubscription, TenantSubscription.plan_id == SubscriptionPlan.id,
        ).group_by(
            SubscriptionPlan.tier,
        ).order_by(
            func.count(TenantSubscription.id).desc(),
        ).all()

        return {
            "total": total_subs,
            "active": active_subs,
            "trialing": trialing,
            "past_due": past_due,
            "canceled": canceled,
            "by_status": [
                {"status": row.status.value if hasattr(row.status, 'value') else str(row.status), "count": row.count}
                for row in tier_distribution
            ],
            "by_plan_tier": [
                {"tier": row.tier.value if hasattr(row.tier, 'value') else str(row.tier), "count": row.count}
                for row in plan_distribution
            ],
        }

    @staticmethod
    def get_user_overview(db: Session) -> dict:
        total = db.query(func.count(User.id)).scalar() or 0
        total_with_org = db.query(func.count(User.id)).filter(
            User.tenant_id.isnot(None),
        ).scalar() or 0

        role_distribution = db.query(
            User.role,
            func.count(User.id).label("count"),
        ).group_by(User.role).order_by(
            func.count(User.id).desc(),
        ).all()

        return {
            "total_users": total,
            "users_with_org": total_with_org,
            "by_role": [
                {"role": row.role.value if hasattr(row.role, 'value') else str(row.role), "count": row.count}
                for row in role_distribution
            ],
        }

    @staticmethod
    def get_active_users_trend(db: Session, days: int = 30) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        results = db.query(
            func.date(User.created_at).label("date"),
            func.count(User.id).label("count"),
        ).filter(
            User.created_at >= cutoff,
        ).group_by(
            func.date(User.created_at),
        ).order_by(
            func.date(User.created_at),
        ).all()

        return [
            {"date": str(row.date), "count": row.count}
            for row in results
        ]

    @staticmethod
    def get_api_usage_stats(db: Session) -> dict:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)

        total_trans = db.query(func.count(CreditTransaction.id)).scalar() or 0

        today_trans = db.query(func.count(CreditTransaction.id)).filter(
            CreditTransaction.created_at >= today_start,
        ).scalar() or 0

        week_trans = db.query(func.count(CreditTransaction.id)).filter(
            CreditTransaction.created_at >= week_start,
        ).scalar() or 0

        total_credits_used = db.query(func.coalesce(func.sum(CreditTransaction.credits_used), 0)).filter(
            CreditTransaction.transaction_type == "deduction",
        ).scalar() or 0

        return {
            "total_transactions": total_trans,
            "today_transactions": today_trans,
            "week_transactions": week_trans,
            "total_credits_used": int(total_credits_used),
        }

    @staticmethod
    def get_ai_usage_stats(db: Session) -> dict:
        total = db.query(func.count(AIAnalysis.id)).scalar() or 0
        total_tokens = db.query(func.coalesce(func.sum(AIAnalysis.tokens_used), 0)).scalar() or 0

        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today = db.query(func.count(AIAnalysis.id)).filter(
            AIAnalysis.created_at >= today_start,
        ).scalar() or 0

        today_tokens = db.query(func.coalesce(func.sum(AIAnalysis.tokens_used), 0)).filter(
            AIAnalysis.created_at >= today_start,
        ).scalar() or 0

        return {
            "total_analyses": total,
            "total_tokens_used": int(total_tokens),
            "today_analyses": today,
            "today_tokens": int(today_tokens),
        }

    @staticmethod
    def get_ai_trend(db: Session, days: int = 30) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        results = db.query(
            func.date(AIAnalysis.created_at).label("date"),
            func.count(AIAnalysis.id).label("count"),
            func.coalesce(func.sum(AIAnalysis.tokens_used), 0).label("tokens"),
        ).filter(
            AIAnalysis.created_at >= cutoff,
        ).group_by(
            func.date(AIAnalysis.created_at),
        ).order_by(
            func.date(AIAnalysis.created_at),
        ).all()

        return [
            {"date": str(row.date), "count": row.count, "tokens": int(row.tokens)}
            for row in results
        ]

    @staticmethod
    def get_comprehensive_dashboard(db: Session) -> dict:
        org_overview = SuperAdminService.get_org_overview(db)
        plan_distribution = SuperAdminService.get_plan_distribution(db)
        revenue = SuperAdminService.get_revenue_summary(db)
        revenue_by_month = SuperAdminService.get_revenue_by_month(db)
        subscription = SuperAdminService.get_subscription_overview(db)
        users = SuperAdminService.get_user_overview(db)
        api = SuperAdminService.get_api_usage_stats(db)
        ai = SuperAdminService.get_ai_usage_stats(db)

        return {
            "organizations": org_overview,
            "plan_distribution": plan_distribution,
            "revenue": revenue,
            "revenue_by_month": revenue_by_month,
            "subscriptions": subscription,
            "users": users,
            "api_usage": api,
            "ai_usage": ai,
        }

    @staticmethod
    def get_signups_trend(db: Session, days: int = 30) -> dict:
        return {
            "org_signups": SuperAdminService.get_org_signups(db, days),
            "user_signups": SuperAdminService.get_active_users_trend(db, days),
            "ai_trend": SuperAdminService.get_ai_trend(db, days),
        }
