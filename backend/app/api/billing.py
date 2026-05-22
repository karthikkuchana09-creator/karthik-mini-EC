import os
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.api.deps import get_db, get_current_user
from app.core.tenant import get_current_tenant_id, require_active_tenant
from app.models.user import User
from app.schemas.invoice import (
    InvoiceResponse, FailedPaymentResponse,
    BillingAnalyticsResponse, RevenueSummary,
    GenerateInvoiceRequest, CancelInvoiceRequest,
)
from app.repository.billing_repository import list_invoices as repo_list_invoices, list_failed_payments as repo_list_failed_payments
from app.services.invoice_service import InvoiceService
from app.services.billing_analytics_service import BillingAnalyticsService
from app.core.log import get_logger

logger = get_logger("billing_api")
router = APIRouter(prefix="/billing", tags=["Billing"])


def _get_org_id(request: Request, user: User) -> int:
    return user.tenant_id or get_current_tenant_id(request) or require_active_tenant(request)


@router.get("/invoices", response_model=Page[InvoiceResponse])
def list_invoices(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    status: str = Query(None),
):
    org_id = _get_org_id(request, user)
    return repo_list_invoices(db, org_id, status=status)


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    inv = InvoiceService.get_invoice(db, invoice_id)
    if not inv or inv.organization_id != org_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return inv


@router.post("/invoices/generate", response_model=InvoiceResponse)
def generate_invoice(
    body: GenerateInvoiceRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    inv = InvoiceService.generate_from_payment(db, body.payment_id)
    if not inv:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if inv.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return inv


@router.post("/invoices/{invoice_id}/issue", response_model=InvoiceResponse)
def issue_invoice(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    inv = InvoiceService.get_invoice(db, invoice_id)
    if not inv or inv.organization_id != org_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return InvoiceService.issue_invoice(db, invoice_id)


@router.post("/invoices/{invoice_id}/mark-paid", response_model=InvoiceResponse)
def mark_invoice_paid(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    inv = InvoiceService.get_invoice(db, invoice_id)
    if not inv or inv.organization_id != org_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return InvoiceService.mark_paid(db, invoice_id)


@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel_invoice(
    invoice_id: int,
    body: CancelInvoiceRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    inv = InvoiceService.get_invoice(db, invoice_id)
    if not inv or inv.organization_id != org_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return InvoiceService.cancel_invoice(db, invoice_id, reason=body.reason)


@router.get("/invoices/{invoice_id}/html", response_class=HTMLResponse)
def get_invoice_html(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    inv = InvoiceService.get_invoice(db, invoice_id)
    if not inv or inv.organization_id != org_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return InvoiceService.get_invoice_html(inv)


@router.get("/invoices/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    inv = InvoiceService.get_invoice(db, invoice_id)
    if not inv or inv.organization_id != org_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    pdf_path = InvoiceService.get_pdf_path(inv)
    if not pdf_path or not os.path.exists(pdf_path):
        html = InvoiceService.get_invoice_html(inv)
        return HTMLResponse(content=html)

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{inv.invoice_number}.pdf",
    )


@router.get("/analytics", response_model=BillingAnalyticsResponse)
def get_billing_analytics(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    return BillingAnalyticsService.get_comprehensive_analytics(db, org_id)


@router.get("/analytics/revenue", response_model=RevenueSummary)
def get_revenue_summary(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    return BillingAnalyticsService.get_revenue_summary(db, org_id)


@router.get("/failed-payments", response_model=Page[FailedPaymentResponse])
def get_failed_payments(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    return repo_list_failed_payments(db, org_id)


@router.post("/failed-payments/{log_id}/resolve")
def resolve_failed_payment(
    log_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    entry = InvoiceService.resolve_failed_payment(db, log_id)
    if entry.organization_id != org_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return {"status": "resolved", "id": log_id}
