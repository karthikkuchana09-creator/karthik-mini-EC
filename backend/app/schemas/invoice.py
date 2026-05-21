from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TaxBreakdown(BaseModel):
    cgst: int = 0
    sgst: int = 0
    igst: int = 0
    tax_pct: int = 18
    tax_amount: int = 0


class InvoiceResponse(BaseModel):
    id: int
    organization_id: int
    user_id: Optional[int]
    invoice_number: str
    invoice_type: str
    status: str
    amount: int
    amount_paid: int
    tax_pct: int
    tax_amount: int
    cgst: int
    sgst: int
    igst: int
    total_amount: int
    currency: str
    billing_name: Optional[str]
    billing_address: Optional[str]
    billing_gstin: Optional[str]
    billing_email: Optional[str]
    plan_tier: Optional[str]
    billing_interval: Optional[str]
    credit_amount: Optional[int]
    billing_period_start: Optional[datetime]
    billing_period_end: Optional[datetime]
    issued_date: Optional[datetime]
    due_date: Optional[datetime]
    paid_date: Optional[datetime]
    cancelled_date: Optional[datetime]
    payment_id: Optional[int]
    subscription_id: Optional[int]
    notes: Optional[str]
    terms: Optional[str]
    pdf_path: Optional[str]
    receipt_pdf_path: Optional[str]
    created_at: datetime
    tax_breakdown: Optional[TaxBreakdown] = None

    model_config = {"from_attributes": True}


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int
    page: int
    size: int
    total_amount_sum: int
    total_tax_sum: int


class FailedPaymentResponse(BaseModel):
    id: int
    organization_id: int
    payment_id: Optional[int]
    razorpay_order_id: Optional[str]
    razorpay_payment_id: Optional[str]
    amount: int
    currency: str
    payment_type: Optional[str]
    error_code: Optional[str]
    error_description: Optional[str]
    failure_reason: Optional[str]
    attempt_count: int
    resolved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class FailedPaymentListResponse(BaseModel):
    items: list[FailedPaymentResponse]
    total: int
    page: int
    size: int


class RevenueSummary(BaseModel):
    total_revenue: int
    total_revenue_inr: float
    current_mrr: int
    current_mrr_inr: float
    current_arr: int
    current_arr_inr: float
    paid_invoices_count: int
    total_invoices_count: int
    cancelled_invoices_count: int
    avg_revenue_per_customer: Optional[float]
    currency: str = "INR"


class RevenueByPeriodItem(BaseModel):
    period: str
    amount: int
    count: int


class RevenueByPlanItem(BaseModel):
    plan_tier: str
    amount: int
    count: int


class BillingAnalyticsResponse(BaseModel):
    summary: RevenueSummary
    revenue_by_month: list[RevenueByPeriodItem]
    revenue_by_plan: list[RevenueByPlanItem]
    failed_payments_count: int
    recent_failed: list[FailedPaymentResponse]


class GenerateInvoiceRequest(BaseModel):
    payment_id: int = Field(..., description="RazorpayPayment ID to generate invoice for")


class CancelInvoiceRequest(BaseModel):
    reason: Optional[str] = None
