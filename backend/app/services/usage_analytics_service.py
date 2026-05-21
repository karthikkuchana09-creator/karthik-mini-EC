from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.subscription import SubscriptionPlan, TenantSubscription, BillingHistory
from app.models.credit import UsageCredit, CreditTransaction, TransactionType
from app.models.user import User
from app.models.task import Task
from app.models.document import Document
from app.models.ai import AIAnalysis
from app.models.audit_log import AuditLog
from app.services.subscription_service import SubscriptionService
from app.services.credit_service import CreditService, CREDIT_COSTS, PLAN_CREDIT_ALLOCATIONS
from app.core.log import get_logger

logger = get_logger("usage_analytics")


class UsageAnalyticsService:

    @staticmethod
    def get_subscription_current(db: Session, org_id: int) -> dict:
        sub = SubscriptionService.get_or_create_subscription(db, org_id)
        plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
        if not plan:
            return {"error": "No plan found"}

        now = datetime.utcnow()
        days_remaining = sub.days_remaining
        period_total_days = 30 if sub.billing_interval and sub.billing_interval.value == "monthly" else 365
        elapsed = period_total_days - days_remaining if period_total_days > 0 else 0
        pct_elapsed = round((elapsed / period_total_days) * 100, 1) if period_total_days > 0 else 0

        price_cents = plan.price_monthly if (not sub.billing_interval or sub.billing_interval.value == "monthly") else plan.price_yearly
        price_per_day = round(price_cents / period_total_days, 2) if period_total_days > 0 else 0
        projected_monthly = round(price_per_day * 30, 2)

        if sub.billing_interval and sub.billing_interval.value == "yearly":
            savings_vs_monthly = plan.price_monthly * 12 - plan.price_yearly
        else:
            savings_vs_monthly = 0

        recent_billing = db.query(BillingHistory).filter(
            BillingHistory.organization_id == org_id,
        ).order_by(BillingHistory.created_at.desc()).limit(5).all()

        return {
            "subscription": {
                "id": sub.id,
                "status": sub.status.value if hasattr(sub.status, "value") else sub.status,
                "billing_interval": sub.billing_interval.value if hasattr(sub.billing_interval, "value") else sub.billing_interval,
                "auto_renew": sub.auto_renew,
                "is_active": sub.is_active,
                "is_expired": sub.is_expired,
                "on_trial": sub.on_trial,
                "start_date": sub.start_date.isoformat() if sub.start_date else None,
                "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
                "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
                "canceled_at": sub.canceled_at.isoformat() if sub.canceled_at else None,
            },
            "plan": {
                "tier": plan.tier.value if hasattr(plan.tier, "value") else plan.tier,
                "name": plan.name,
                "description": plan.description,
                "sort_order": plan.sort_order,
                "price_monthly": plan.price_monthly,
                "price_yearly": plan.price_yearly,
                "max_users": plan.max_users,
                "max_tasks": plan.max_tasks,
                "max_ai_queries": plan.max_ai_queries,
                "max_storage_mb": plan.max_storage_mb,
                "max_teams": plan.max_teams,
            },
            "billing": {
                "price_cents": price_cents,
                "price_per_day_cents": price_per_day,
                "projected_monthly_cents": projected_monthly,
                "savings_vs_monthly_cents": max(0, savings_vs_monthly),
                "period_days": period_total_days,
                "days_remaining": days_remaining,
                "days_elapsed": elapsed,
                "pct_elapsed": pct_elapsed,
                "currency": "USD",
            },
            "recent_billing_events": [
                {
                    "id": e.id,
                    "event_type": e.event_type,
                    "description": e.description,
                    "amount": e.amount,
                    "interval": e.interval,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
                for e in recent_billing
            ],
        }

    @staticmethod
    def get_credit_usage(db: Session, org_id: int) -> dict:
        account = CreditService.get_or_create_account(db, org_id)

        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)

        last_7_days = db.query(
            func.sum(CreditTransaction.credits_used).label("total_used"),
            func.count(CreditTransaction.id).label("count"),
        ).filter(
            CreditTransaction.organization_id == org_id,
            CreditTransaction.transaction_type == TransactionType.deduction.value,
            CreditTransaction.created_at >= seven_days_ago,
        ).first()

        last_30_days = db.query(
            func.sum(CreditTransaction.credits_used).label("total_used"),
            func.count(CreditTransaction.id).label("count"),
        ).filter(
            CreditTransaction.organization_id == org_id,
            CreditTransaction.transaction_type == TransactionType.deduction.value,
            CreditTransaction.created_at >= thirty_days_ago,
        ).first()

        daily_trend = db.query(
            func.date(CreditTransaction.created_at).label("day"),
            func.sum(CreditTransaction.credits_used).label("total_used"),
            func.count(CreditTransaction.id).label("count"),
        ).filter(
            CreditTransaction.organization_id == org_id,
            CreditTransaction.transaction_type == TransactionType.deduction.value,
            CreditTransaction.created_at >= thirty_days_ago,
        ).group_by(
            func.date(CreditTransaction.created_at),
        ).order_by(
            func.date(CreditTransaction.created_at),
        ).all()

        avg_daily_usage = round((last_30_days.total_used or 0) / 30, 1)
        projected_exhaustion_days = None
        if avg_daily_usage > 0:
            projected_exhaustion_days = round(account.remaining_credits / avg_daily_usage)

        feature_breakdown = db.query(
            CreditTransaction.feature,
            func.sum(CreditTransaction.credits_used).label("total_used"),
            func.count(CreditTransaction.id).label("call_count"),
        ).filter(
            CreditTransaction.organization_id == org_id,
            CreditTransaction.transaction_type == TransactionType.deduction.value,
        ).group_by(CreditTransaction.feature).order_by(
            func.sum(CreditTransaction.credits_used).desc(),
        ).all()

        return {
            "account": {
                "total_credits": account.total_credits,
                "used_credits": account.used_credits,
                "remaining_credits": account.remaining_credits,
                "usage_pct": account.usage_pct,
                "is_low": account.is_low,
                "is_exhausted": account.is_exhausted,
                "low_credit_threshold": account.low_credit_threshold,
                "last_reset_at": account.last_reset_at.isoformat() if account.last_reset_at else None,
            },
            "trends": {
                "last_7_days_used": last_7_days.total_used or 0,
                "last_7_days_calls": last_7_days.count or 0,
                "last_30_days_used": last_30_days.total_used or 0,
                "last_30_days_calls": last_30_days.count or 0,
                "avg_daily_usage": avg_daily_usage,
                "projected_exhaustion_days": projected_exhaustion_days,
                "daily_trend": [
                    {
                        "date": row.day.isoformat() if hasattr(row.day, "isoformat") else str(row.day),
                        "credits_used": row.total_used,
                        "call_count": row.count,
                    }
                    for row in daily_trend
                ],
            },
            "feature_breakdown": [
                {
                    "feature": row.feature,
                    "credits_used": int(row.total_used),
                    "call_count": row.call_count,
                    "cost_per_call": CREDIT_COSTS.get(row.feature),
                }
                for row in feature_breakdown
            ],
        }

    @staticmethod
    def get_api_usage(db: Session, org_id: int) -> dict:
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=30)

        total_api_calls = db.query(func.count(AuditLog.id)).filter(
            AuditLog.tenant_id == org_id,
        ).scalar()

        recent_api_calls = db.query(func.count(AuditLog.id)).filter(
            AuditLog.tenant_id == org_id,
            AuditLog.timestamp >= thirty_days_ago,
        ).scalar()

        calls_by_endpoint = db.query(
            AuditLog.action,
            func.count(AuditLog.id).label("call_count"),
        ).filter(
            AuditLog.tenant_id == org_id,
            AuditLog.timestamp >= thirty_days_ago,
        ).group_by(AuditLog.action).order_by(
            func.count(AuditLog.id).desc(),
        ).limit(15).all()

        calls_by_day = db.query(
            func.date(AuditLog.timestamp).label("day"),
            func.count(AuditLog.id).label("call_count"),
        ).filter(
            AuditLog.tenant_id == org_id,
            AuditLog.timestamp >= seven_days_ago,
        ).group_by(
            func.date(AuditLog.timestamp),
        ).order_by(
            func.date(AuditLog.timestamp),
        ).all()

        return {
            "total_calls": total_api_calls or 0,
            "recent_30_days": recent_api_calls or 0,
            "top_endpoints": [
                {
                    "action": row.action,
                    "call_count": row.call_count,
                }
                for row in calls_by_endpoint
            ],
            "daily_calls": [
                {
                    "date": row.day.isoformat() if hasattr(row.day, "isoformat") else str(row.day),
                    "call_count": row.call_count,
                }
                for row in calls_by_day
            ],
        }

    @staticmethod
    def get_storage_usage(db: Session, org_id: int) -> dict:
        import os
        storage_stats = db.query(
            func.count(Document.id).label("total_files"),
        ).filter(
            Document.tenant_id == org_id,
        ).first()

        all_docs = db.query(Document).filter(
            Document.tenant_id == org_id,
        ).all()

        total_files = storage_stats.total_files or 0

        files_by_type = {}
        for d in all_docs:
            ext = os.path.splitext(d.file_name)[1].lower() or "unknown"
            files_by_type.setdefault(ext, {"file_count": 0})
            files_by_type[ext]["file_count"] += 1

        recent_uploads = db.query(Document).filter(
            Document.tenant_id == org_id,
        ).order_by(Document.created_at.desc()).limit(10).all()

        return {
            "total_files": total_files,
            "files_by_type": [
                {
                    "file_type": ext,
                    "file_count": stats["file_count"],
                }
                for ext, stats in sorted(files_by_type.items(), key=lambda x: -x[1]["file_count"])
            ],
            "recent_uploads": [
                {
                    "id": d.id,
                    "file_name": d.file_name,
                    "file_type": os.path.splitext(d.file_name)[1].lower() or "unknown",
                    "created_at": d.created_at.isoformat() if d.created_at else None,
                }
                for d in recent_uploads
            ],
        }

    @staticmethod
    def get_ai_usage(db: Session, org_id: int) -> dict:
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)

        total_ai_queries = db.query(func.count(AIAnalysis.id)).filter(
            AIAnalysis.tenant_id == org_id,
        ).scalar()

        recent_ai_queries = db.query(func.count(AIAnalysis.id)).filter(
            AIAnalysis.tenant_id == org_id,
            AIAnalysis.created_at >= thirty_days_ago,
        ).scalar()

        ai_by_type = db.query(
            AIAnalysis.model_name,
            func.count(AIAnalysis.id).label("query_count"),
        ).filter(
            AIAnalysis.tenant_id == org_id,
        ).group_by(AIAnalysis.model_name).order_by(
            func.count(AIAnalysis.id).desc(),
        ).all()

        ai_by_day = db.query(
            func.date(AIAnalysis.created_at).label("day"),
            func.count(AIAnalysis.id).label("query_count"),
        ).filter(
            AIAnalysis.tenant_id == org_id,
            AIAnalysis.created_at >= thirty_days_ago,
        ).group_by(
            func.date(AIAnalysis.created_at),
        ).order_by(
            func.date(AIAnalysis.created_at),
        ).all()

        credit_cost_for_ai = sum(
            cost for feature, cost in CREDIT_COSTS.items() if feature.startswith("ai_")
        )

        return {
            "total_queries": total_ai_queries or 0,
            "recent_30_days": recent_ai_queries or 0,
            "queries_by_type": [
                {
                    "model_name": row.model_name,
                    "query_count": row.query_count,
                }
                for row in ai_by_type
            ],
            "daily_queries": [
                {
                    "date": row.day.isoformat() if hasattr(row.day, "isoformat") else str(row.day),
                    "query_count": row.query_count,
                }
                for row in ai_by_day
            ],
            "credit_cost_per_query": credit_cost_for_ai,
        }

    @staticmethod
    def get_users_usage(db: Session, org_id: int) -> dict:
        total_users = db.query(func.count(User.id)).filter(
            User.tenant_id == org_id,
            User.is_active == True,
        ).scalar()

        users_by_role = db.query(
            User.subscription_role,
            func.count(User.id).label("user_count"),
        ).filter(
            User.tenant_id == org_id,
            User.is_active == True,
        ).group_by(User.subscription_role).all()

        return {
            "total_active_users": total_users or 0,
            "users_by_role": [
                {
                    "role": row.subscription_role or "member",
                    "count": row.user_count,
                }
                for row in users_by_role
            ],
        }

    @staticmethod
    def get_comprehensive_analytics(db: Session, org_id: int) -> dict:
        subscription = UsageAnalyticsService.get_subscription_current(db, org_id)
        credits = UsageAnalyticsService.get_credit_usage(db, org_id)
        api_usage = UsageAnalyticsService.get_api_usage(db, org_id)
        storage = UsageAnalyticsService.get_storage_usage(db, org_id)
        ai_usage = UsageAnalyticsService.get_ai_usage(db, org_id)
        users = UsageAnalyticsService.get_users_usage(db, org_id)

        credit_trend = credits["trends"]
        credit_pct_change_7d = None
        if credit_trend["last_7_days_used"] > 0:
            prev_7_days = credit_trend["last_30_days_used"] - credit_trend["last_7_days_used"]
            if prev_7_days > 0:
                credit_pct_change_7d = round(
                    ((credit_trend["last_7_days_used"] - prev_7_days) / prev_7_days) * 100, 1
                )

        plan = subscription["plan"]
        total_tasks = db.query(func.count(Task.id)).filter(
            Task.tenant_id == org_id,
        ).scalar() or 0

        limits = {
            "users": {"current": users["total_active_users"], "limit": plan["max_users"], "pct": round((users["total_active_users"] / plan["max_users"]) * 100, 1) if plan["max_users"] > 0 else 0},
            "tasks": {"current": total_tasks, "limit": plan["max_tasks"], "pct": round((total_tasks / plan["max_tasks"]) * 100, 1) if plan["max_tasks"] > 0 else 0},
            "storage_mb": {"current": storage["total_files"], "limit": plan["max_storage_mb"], "pct": round((storage["total_files"] / plan["max_storage_mb"]) * 100, 1) if plan["max_storage_mb"] > 0 else 0},
            "ai_queries": {"current": ai_usage["total_queries"], "limit": plan["max_ai_queries"], "pct": round((ai_usage["total_queries"] / plan["max_ai_queries"]) * 100, 1) if plan["max_ai_queries"] > 0 else 0},
        }

        return {
            "subscription": subscription,
            "credits": credits,
            "api_usage": api_usage,
            "storage": storage,
            "ai_usage": ai_usage,
            "users": users,
            "limits": limits,
            "insights": {
                "credit_trend_pct_7d": credit_pct_change_7d,
                "projected_exhaustion_days": credit_trend["projected_exhaustion_days"],
                "avg_daily_credit_burn": credit_trend["avg_daily_usage"],
                "total_recent_credit_usage_30d": credit_trend["last_30_days_used"],
                "is_near_user_limit": limits["users"]["pct"] >= 80,
                "is_near_storage_limit": limits["storage_mb"]["pct"] >= 80,
                "is_near_ai_limit": limits["ai_queries"]["pct"] >= 80,
                "generated_at": datetime.utcnow().isoformat(),
            },
        }
