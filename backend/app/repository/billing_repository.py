from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.invoice import Invoice, FailedPaymentLog


def list_invoices(db: Session, org_id: int, status: str = None):
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.organization))
        .where(Invoice.organization_id == org_id)
    )
    if status:
        stmt = stmt.where(Invoice.status == status)
    stmt = stmt.order_by(Invoice.created_at.desc())
    return paginate(db, stmt)


def list_failed_payments(db: Session, org_id: int):
    stmt = (
        select(FailedPaymentLog)
        .options(selectinload(FailedPaymentLog.organization))
        .where(FailedPaymentLog.organization_id == org_id)
        .order_by(FailedPaymentLog.created_at.desc())
    )
    return paginate(db, stmt)
