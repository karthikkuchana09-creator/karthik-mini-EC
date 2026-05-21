from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.core.log import get_logger
from app.models.invoice import Invoice, InvoiceStatus, FailedPaymentLog
from app.models.payment import RazorpayPayment, PaymentStatus
from app.models.organization import Organization

logger = get_logger("billing_analytics")


class BillingAnalyticsService:

    @staticmethod
    def get_revenue_summary(db: Session, org_id: int) -> dict:
        paid_invoices = db.query(Invoice).filter(
            Invoice.organization_id == org_id,
            Invoice.status == InvoiceStatus.paid.value,
        )

        total_revenue = paid_invoices.with_entities(
            func.coalesce(func.sum(Invoice.total_amount), 0),
        ).scalar()

        paid_count = paid_invoices.count()

        total_invoices = db.query(func.count(Invoice.id)).filter(
            Invoice.organization_id == org_id,
        ).scalar()

        cancelled_count = db.query(func.count(Invoice.id)).filter(
            Invoice.organization_id == org_id,
            Invoice.status == InvoiceStatus.cancelled.value,
        ).scalar()

        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        current_mrr = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
            Invoice.organization_id == org_id,
            Invoice.status == InvoiceStatus.paid.value,
            Invoice.paid_date >= month_start,
        ).scalar()

        avg_revenue = round(total_revenue / paid_count, 2) if paid_count > 0 else None

        return {
            "total_revenue": int(total_revenue),
            "total_revenue_inr": round(total_revenue / 100, 2),
            "current_mrr": int(current_mrr),
            "current_mrr_inr": round(current_mrr / 100, 2),
            "current_arr": int(current_mrr * 12),
            "current_arr_inr": round(current_mrr * 12 / 100, 2),
            "paid_invoices_count": paid_count,
            "total_invoices_count": total_invoices or 0,
            "cancelled_invoices_count": cancelled_count or 0,
            "avg_revenue_per_customer": avg_revenue,
            "currency": "INR",
        }

    @staticmethod
    def get_revenue_by_month(db: Session, org_id: int, months: int = 12) -> list[dict]:
        now = datetime.utcnow()
        cutoff = now - timedelta(days=months * 31)

        results = db.query(
            extract("year", Invoice.paid_date).label("year"),
            extract("month", Invoice.paid_date).label("month"),
            func.coalesce(func.sum(Invoice.total_amount), 0).label("amount"),
            func.count(Invoice.id).label("count"),
        ).filter(
            Invoice.organization_id == org_id,
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
    def get_revenue_by_plan(db: Session, org_id: int) -> list[dict]:
        results = db.query(
            Invoice.plan_tier,
            func.coalesce(func.sum(Invoice.total_amount), 0).label("amount"),
            func.count(Invoice.id).label("count"),
        ).filter(
            Invoice.organization_id == org_id,
            Invoice.status == InvoiceStatus.paid.value,
            Invoice.plan_tier.isnot(None),
        ).group_by(Invoice.plan_tier).order_by(
            func.sum(Invoice.total_amount).desc(),
        ).all()

        return [
            {
                "plan_tier": row.plan_tier or "unknown",
                "amount": int(row.amount),
                "count": row.count,
            }
            for row in results
        ]

    @staticmethod
    def get_failed_payments_summary(db: Session, org_id: int) -> dict:
        total_failed = db.query(func.count(FailedPaymentLog.id)).filter(
            FailedPaymentLog.organization_id == org_id,
        ).scalar()

        unresolved = db.query(func.count(FailedPaymentLog.id)).filter(
            FailedPaymentLog.organization_id == org_id,
            FailedPaymentLog.resolved == False,
        ).scalar()

        recent = db.query(FailedPaymentLog).filter(
            FailedPaymentLog.organization_id == org_id,
        ).order_by(FailedPaymentLog.created_at.desc()).limit(10).all()

        return {
            "total_failed": total_failed or 0,
            "unresolved": unresolved or 0,
            "recent": [
                {
                    "id": f.id,
                    "amount": f.amount,
                    "error_code": f.error_code,
                    "error_description": f.error_description,
                    "attempt_count": f.attempt_count,
                    "resolved": f.resolved,
                    "created_at": f.created_at.isoformat() if f.created_at else None,
                }
                for f in recent
            ],
        }

    @staticmethod
    def get_comprehensive_analytics(db: Session, org_id: int) -> dict:
        summary = BillingAnalyticsService.get_revenue_summary(db, org_id)
        revenue_by_month = BillingAnalyticsService.get_revenue_by_month(db, org_id)
        revenue_by_plan = BillingAnalyticsService.get_revenue_by_plan(db, org_id)
        failed = BillingAnalyticsService.get_failed_payments_summary(db, org_id)

        return {
            "summary": summary,
            "revenue_by_month": revenue_by_month,
            "revenue_by_plan": revenue_by_plan,
            "failed_payments_count": failed["total_failed"],
            "recent_failed": failed["recent"],
        }
