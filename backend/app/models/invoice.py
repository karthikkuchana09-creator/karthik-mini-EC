from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, DateTime, Text, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    issued = "issued"
    paid = "paid"
    cancelled = "cancelled"
    refunded = "refunded"


class InvoiceType(str, enum.Enum):
    plan_purchase = "plan_purchase"
    subscription_recurring = "subscription_recurring"
    credit_topup = "credit_topup"
    refund = "refund"
    manual = "manual"


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    invoice_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    invoice_type: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=InvoiceStatus.draft.value, nullable=False)

    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_paid: Mapped[int] = mapped_column(Integer, default=0)
    tax_pct: Mapped[int] = mapped_column(Integer, default=18)
    tax_amount: Mapped[int] = mapped_column(Integer, default=0)
    cgst: Mapped[int] = mapped_column(Integer, default=0)
    sgst: Mapped[int] = mapped_column(Integer, default=0)
    igst: Mapped[int] = mapped_column(Integer, default=0)
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")

    billing_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    billing_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    billing_gstin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    billing_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    plan_tier: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    billing_interval: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    credit_amount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    billing_period_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    billing_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    issued_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    paid_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancelled_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    payment_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("razorpay_payments.id", ondelete="SET NULL"), nullable=True)
    subscription_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tenant_subscriptions.id", ondelete="SET NULL"), nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    receipt_pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    organization: Mapped["Organization"] = relationship("Organization", foreign_keys=[organization_id])
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])
    payment: Mapped[Optional["RazorpayPayment"]] = relationship("RazorpayPayment", foreign_keys=[payment_id])


class FailedPaymentLog(Base):
    __tablename__ = "failed_payment_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("razorpay_payments.id", ondelete="SET NULL"), nullable=True)

    razorpay_order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    amount: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    payment_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    attempt_count: Mapped[int] = mapped_column(Integer, default=1)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", foreign_keys=[organization_id])
    payment: Mapped[Optional["RazorpayPayment"]] = relationship("RazorpayPayment", foreign_keys=[payment_id])
