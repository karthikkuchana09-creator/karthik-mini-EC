from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.credit import CreditTransaction


def list_credit_transactions(db: Session, org_id: int, feature: str = None):
    stmt = (
        select(CreditTransaction)
        .options(selectinload(CreditTransaction.organization))
        .where(CreditTransaction.organization_id == org_id)
    )
    if feature:
        stmt = stmt.where(CreditTransaction.feature == feature)
    stmt = stmt.order_by(CreditTransaction.created_at.desc())
    return paginate(db, stmt)
