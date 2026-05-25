import os
import shutil
import json
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.log import get_logger
from app.models.invoice import Invoice, InvoiceStatus, InvoiceType, FailedPaymentLog
from app.models.payment import RazorpayPayment, PaymentStatus
from app.models.organization import Organization
from app.models.user import User

logger = get_logger("invoice_service")

INVOICES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "storage", "invoices",
)


def _ensure_invoice_dir():
    os.makedirs(INVOICES_DIR, exist_ok=True)


def _invoice_number(db: Session) -> str:
    year = datetime.utcnow().year
    year_start = datetime(year, 1, 1)
    year_end = datetime(year + 1, 1, 1)
    count = db.scalar(select(func.count(Invoice.id)).where(
        Invoice.created_at >= year_start,
        Invoice.created_at < year_end,
    )) or 0
    return f"INV-{year}-{count + 1:05d}"


def _format_paise(paise: int) -> str:
    rupees = paise / 100
    return f"{rupees:,.2f}"


def calculate_tax(amount_paise: int, tax_pct: int = 18, is_interstate: bool = False) -> dict:
    tax_amount = round(amount_paise * tax_pct / 100)
    if is_interstate:
        return {
            "cgst": 0,
            "sgst": 0,
            "igst": tax_amount,
            "tax_pct": tax_pct,
            "tax_amount": tax_amount,
        }
    half = tax_amount // 2
    return {
        "cgst": half,
        "sgst": tax_amount - half,
        "igst": 0,
        "tax_pct": tax_pct,
        "tax_amount": tax_amount,
    }


class InvoiceService:

    @staticmethod
    def generate_from_payment(db: Session, payment_id: int) -> Optional[Invoice]:
        payment = db.scalar(select(RazorpayPayment).where(
            RazorpayPayment.id == payment_id,
        ))
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Payment {payment_id} not found",
            )

        existing = db.scalar(select(Invoice).where(
            Invoice.payment_id == payment_id,
        ))
        if existing:
            return existing

        tax = calculate_tax(payment.amount, is_interstate=False)
        total_amount = payment.amount + tax["tax_amount"]

        inv = Invoice(
            organization_id=payment.organization_id,
            user_id=payment.user_id,
            invoice_number=_invoice_number(db),
            invoice_type=payment.payment_type or "manual",
            status=InvoiceStatus.draft.value,
            amount=payment.amount,
            amount_paid=payment.amount_paid or 0,
            tax_pct=tax["tax_pct"],
            tax_amount=tax["tax_amount"],
            cgst=tax["cgst"],
            sgst=tax["sgst"],
            igst=tax["igst"],
            total_amount=total_amount,
            currency=payment.currency or "INR",
            plan_tier=payment.plan_tier,
            billing_interval=payment.billing_interval,
            credit_amount=payment.credit_amount,
            payment_id=payment.id,
            notes=f"Invoice for payment {payment.razorpay_payment_id or payment.razorpay_order_id}",
        )

        org = db.scalar(select(Organization).where(
            Organization.id == payment.organization_id,
        ))
        if org:
            inv.billing_name = org.name

        if payment.user_id:
            user = db.scalar(select(User).where(User.id == payment.user_id))
            if user:
                inv.billing_email = user.email

        db.add(inv)
        db.commit()
        db.refresh(inv)
        logger.info(
            "Created invoice %s for org_id=%d payment=%d",
            inv.invoice_number, payment.organization_id, payment_id,
        )
        return inv

    @staticmethod
    def issue_invoice(db: Session, invoice_id: int) -> Invoice:
        inv = db.scalar(select(Invoice).where(Invoice.id == invoice_id))
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

        inv.status = InvoiceStatus.issued.value
        inv.issued_date = datetime.utcnow()
        inv.due_date = datetime.utcnow() + timedelta(days=15)
        db.commit()
        db.refresh(inv)
        logger.info("Issued invoice %s", inv.invoice_number)
        return inv

    @staticmethod
    def mark_paid(db: Session, invoice_id: int, paid_amount: Optional[int] = None) -> Invoice:
        inv = db.scalar(select(Invoice).where(Invoice.id == invoice_id))
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

        inv.status = InvoiceStatus.paid.value
        inv.paid_date = datetime.utcnow()
        if paid_amount:
            inv.amount_paid = paid_amount
        else:
            inv.amount_paid = inv.total_amount
        db.commit()
        db.refresh(inv)
        logger.info("Marked invoice %s as paid", inv.invoice_number)

        InvoiceService._generate_pdf(inv)
        return inv

    @staticmethod
    def cancel_invoice(db: Session, invoice_id: int, reason: Optional[str] = None) -> Invoice:
        inv = db.scalar(select(Invoice).where(Invoice.id == invoice_id))
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        if inv.status == InvoiceStatus.paid.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel a paid invoice. Issue a refund instead.",
            )

        inv.status = InvoiceStatus.cancelled.value
        inv.cancelled_date = datetime.utcnow()
        inv.notes = (inv.notes or "") + f"\nCancelled: {reason or 'No reason provided'}"
        db.commit()
        db.refresh(inv)
        logger.info("Cancelled invoice %s", inv.invoice_number)
        return inv

    @staticmethod
    def get_invoice(db: Session, invoice_id: int) -> Optional[Invoice]:
        return db.scalar(select(Invoice).where(Invoice.id == invoice_id))

    @staticmethod
    def get_invoice_by_number(db: Session, invoice_number: str) -> Optional[Invoice]:
        return db.scalar(select(Invoice).where(
            Invoice.invoice_number == invoice_number,
        ))

    @staticmethod
    def list_invoices(
        db: Session,
        org_id: int,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
    ) -> dict:
        filters = [Invoice.organization_id == org_id]
        if status:
            filters.append(Invoice.status == status)

        total = db.scalar(select(func.count(Invoice.id)).where(*filters))
        total_amount = db.scalar(select(func.coalesce(func.sum(Invoice.total_amount), 0)).where(
            Invoice.organization_id == org_id,
        ))
        total_tax = db.scalar(select(func.coalesce(func.sum(Invoice.tax_amount), 0)).where(
            Invoice.organization_id == org_id,
        ))

        items = db.execute(select(Invoice).where(*filters).order_by(Invoice.created_at.desc()).offset(skip).limit(limit)).scalars().all()

        return {
            "items": items,
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "size": limit,
            "total_amount_sum": total_amount,
            "total_tax_sum": total_tax,
        }

    @staticmethod
    def get_invoice_html(inv: Invoice) -> str:
        path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "templates", "billing", "invoice.html",
        )
        if not os.path.exists(path):
            logger.warning("Invoice template not found at %s", path)
            return "<html><body><p>Invoice template not found</p></body></html>"

        html = open(path, encoding="utf-8").read()
        from jinja2 import Template
        template = Template(html)
        return template.render(
            invoice_number=inv.invoice_number,
            status=inv.status,
            billing_name=inv.billing_name or "Customer",
            billing_address=inv.billing_address or "",
            billing_gstin=inv.billing_gstin or "",
            billing_email=inv.billing_email or "",
            issued_date=inv.issued_date.strftime("%d %b %Y") if inv.issued_date else "N/A",
            due_date=inv.due_date.strftime("%d %b %Y") if inv.due_date else "Upon Receipt",
            billing_period_start=inv.billing_period_start.strftime("%d %b %Y") if inv.billing_period_start else None,
            billing_period_end=inv.billing_period_end.strftime("%d %b %Y") if inv.billing_period_end else None,
            description=_get_invoice_description(inv),
            plan_tier=inv.plan_tier,
            billing_interval=inv.billing_interval,
            credit_amount=inv.credit_amount,
            currency=inv.currency,
            amount_display=_format_paise(inv.amount),
            tax_pct=inv.tax_pct,
            tax_amount_display=_format_paise(inv.tax_amount),
            cgst=_format_paise(inv.cgst) if inv.cgst else "0.00",
            cgst_display=_format_paise(inv.cgst) if inv.cgst else "0.00",
            sgst=_format_paise(inv.sgst) if inv.sgst else "0.00",
            sgst_display=_format_paise(inv.sgst) if inv.sgst else "0.00",
            igst=_format_paise(inv.igst) if inv.igst else "0.00",
            igst_display=_format_paise(inv.igst) if inv.igst else "0.00",
            total_amount_display=_format_paise(inv.total_amount),
            notes=inv.notes,
            terms=inv.terms,
            generated_at=datetime.utcnow().strftime("%d %b %Y %H:%M"),
        )

    @staticmethod
    def _generate_pdf(inv: Invoice) -> Optional[str]:
        try:
            import weasyprint
        except ImportError:
            logger.warning("weasyprint not installed — skipping PDF generation for invoice %s", inv.invoice_number)
            return None

        _ensure_invoice_dir()
        html = InvoiceService.get_invoice_html(inv)
        pdf_filename = f"{inv.invoice_number}.pdf"
        pdf_path = os.path.join(INVOICES_DIR, pdf_filename)

        try:
            weasyprint.HTML(string=html).write_pdf(pdf_path)
            inv.pdf_path = pdf_path
            logger.info("Generated PDF for invoice %s at %s", inv.invoice_number, pdf_path)
            return pdf_path
        except Exception as exc:
            logger.error("PDF generation failed for invoice %s: %s", inv.invoice_number, exc)
            return None

    @staticmethod
    def get_pdf_path(inv: Invoice) -> Optional[str]:
        if inv.pdf_path and os.path.exists(inv.pdf_path):
            return inv.pdf_path
        path = InvoiceService._generate_pdf(inv)
        return path

    @staticmethod
    def log_failed_payment(
        db: Session,
        org_id: int,
        payment_id: Optional[int],
        razorpay_order_id: Optional[str],
        razorpay_payment_id: Optional[str],
        amount: int,
        currency: str,
        error_code: Optional[str],
        error_description: Optional[str],
        failure_reason: Optional[str] = None,
        payment_type: Optional[str] = None,
    ) -> FailedPaymentLog:
        existing = db.scalar(select(FailedPaymentLog).where(
            FailedPaymentLog.razorpay_payment_id == razorpay_payment_id,
        )) if razorpay_payment_id else None

        if existing:
            existing.attempt_count = FailedPaymentLog.attempt_count + 1
            existing.error_code = error_code or existing.error_code
            existing.error_description = error_description or existing.error_description
            db.commit()
            db.refresh(existing)
            return existing

        log_entry = FailedPaymentLog(
            organization_id=org_id,
            payment_id=payment_id,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            amount=amount,
            currency=currency or "INR",
            payment_type=payment_type,
            error_code=error_code,
            error_description=error_description,
            failure_reason=failure_reason,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        logger.warning(
            "Logged failed payment for org_id=%d: %s - %s",
            org_id, error_code, error_description,
        )
        return log_entry

    @staticmethod
    def get_failed_payments(
        db: Session,
        org_id: int,
        skip: int = 0,
        limit: int = 20,
    ) -> dict:
        total = db.scalar(select(func.count(FailedPaymentLog.id)).where(
            FailedPaymentLog.organization_id == org_id,
        ))
        items = db.execute(select(FailedPaymentLog).where(
            FailedPaymentLog.organization_id == org_id,
        ).order_by(FailedPaymentLog.created_at.desc()).offset(skip).limit(limit)).scalars().all()
        return {
            "items": items,
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "size": limit,
        }

    @staticmethod
    def resolve_failed_payment(db: Session, log_id: int) -> FailedPaymentLog:
        entry = db.scalar(select(FailedPaymentLog).where(FailedPaymentLog.id == log_id))
        if not entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Failed payment log not found")
        entry.resolved = True
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def generate_for_subscription(
        db: Session,
        org_id: int,
        payment_id: int,
        subscription_id: int,
        period_start: datetime,
        period_end: datetime,
    ) -> Invoice:
        inv = InvoiceService.generate_from_payment(db, payment_id)
        if not inv:
            return None

        inv.invoice_type = InvoiceType.subscription_recurring.value
        inv.subscription_id = subscription_id
        inv.billing_period_start = period_start
        inv.billing_period_end = period_end
        inv.terms = "Subscription billing — auto-renews at end of period."
        db.commit()
        db.refresh(inv)

        InvoiceService.issue_invoice(db, inv.id)
        InvoiceService.mark_paid(db, inv.id)
        return inv


def _get_invoice_description(inv: Invoice) -> str:
    if inv.invoice_type == InvoiceType.plan_purchase.value:
        interval = inv.billing_interval or "monthly"
        return f"{inv.plan_tier.title()} Plan — {interval.title()} Subscription"
    elif inv.invoice_type == InvoiceType.subscription_recurring.value:
        interval = inv.billing_interval or "monthly"
        return f"{inv.plan_tier.title()} Plan — {interval.title()} Renewal"
    elif inv.invoice_type == InvoiceType.credit_topup.value:
        return f"Credit Top-Up — {inv.credit_amount or 0} Credits"
    elif inv.invoice_type == InvoiceType.refund.value:
        return f"Refund — {inv.plan_tier or 'Credit'} Adjustment"
    else:
        return f"Enterprise Billing — {inv.invoice_number}"
