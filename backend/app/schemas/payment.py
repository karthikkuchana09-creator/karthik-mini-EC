from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CreateOrderRequest(BaseModel):
    amount: int = Field(..., ge=1, description="Amount in INR (rupees)")
    payment_type: str = Field(..., pattern=r"^(plan_purchase|credit_topup)$")
    plan_tier: Optional[str] = None
    billing_interval: Optional[str] = Field(None, pattern=r"^(monthly|yearly)$")
    credit_amount: Optional[int] = Field(None, ge=1)


class CreateOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int
    amount_paise: int
    currency: str
    key_id: str
    receipt: str
    prefill: dict


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    payment_id: Optional[str] = None
    plan_tier: Optional[str] = None
    credits_added: Optional[int] = None


class CreateSubscriptionRequest(BaseModel):
    plan_tier: str = Field(..., pattern=r"^(silver|gold)$")
    billing_interval: str = Field(default="monthly", pattern=r"^(monthly|yearly)$")


class CreateSubscriptionResponse(BaseModel):
    razorpay_subscription_id: str
    short_url: str
    plan_tier: str
    billing_interval: str
    amount: int


class PaymentHistoryItem(BaseModel):
    id: int
    razorpay_order_id: str
    razorpay_payment_id: Optional[str]
    amount: int
    amount_paid: int
    currency: str
    status: str
    payment_type: str
    plan_tier: Optional[str]
    credit_amount: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentHistoryResponse(BaseModel):
    items: list[PaymentHistoryItem]
    total: int
    page: int
    size: int


class InvoiceItem(BaseModel):
    id: int
    razorpay_invoice_id: str
    razorpay_subscription_id: Optional[str]
    amount: int
    amount_paid: int
    currency: str
    status: str
    invoice_url: Optional[str]
    pdf_url: Optional[str]
    period_start: Optional[datetime]
    period_end: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoiceListResponse(BaseModel):
    items: list[InvoiceItem]
    total: int
    page: int
    size: int
