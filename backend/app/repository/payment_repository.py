from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.payment import RazorpayPayment, RazorpayInvoice


def list_payments(db: Session, org_id: int):
    stmt = (
        select(RazorpayPayment)
        .options(selectinload(RazorpayPayment.organization))
        .where(RazorpayPayment.organization_id == org_id)
        .order_by(RazorpayPayment.created_at.desc())
    )
    return paginate(db, stmt)


def list_razorpay_invoices(db: Session, org_id: int):
    stmt = (
        select(RazorpayInvoice)
        .options(selectinload(RazorpayInvoice.organization))
        .where(RazorpayInvoice.organization_id == org_id)
        .order_by(RazorpayInvoice.created_at.desc())
    )
    return paginate(db, stmt)
