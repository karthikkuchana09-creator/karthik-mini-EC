from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.subscription import SubscriptionPlan, BillingHistory


def list_all_plans(db: Session):
    stmt = select(SubscriptionPlan).where(SubscriptionPlan.is_active == True).order_by(SubscriptionPlan.sort_order)
    return paginate(db, stmt)


def list_billing_history(db: Session, org_id: int):
    stmt = (
        select(BillingHistory)
        .where(BillingHistory.organization_id == org_id)
        .order_by(BillingHistory.created_at.desc())
    )
    return paginate(db, stmt)
