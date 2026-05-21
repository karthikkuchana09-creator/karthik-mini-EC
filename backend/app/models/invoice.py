from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
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

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    invoice_number = Column(String(30), unique=True, nullable=False, index=True)
    invoice_type = Column(String(30), nullable=False)
    status = Column(String(20), default=InvoiceStatus.draft.value, nullable=False)

    amount = Column(Integer, nullable=False)
    amount_paid = Column(Integer, default=0)
    tax_pct = Column(Integer, default=18)
    tax_amount = Column(Integer, default=0)
    cgst = Column(Integer, default=0)
    sgst = Column(Integer, default=0)
    igst = Column(Integer, default=0)
    total_amount = Column(Integer, nullable=False)
    currency = Column(String(3), default="INR")

    billing_name = Column(String(255), nullable=True)
    billing_address = Column(Text, nullable=True)
    billing_gstin = Column(String(20), nullable=True)
    billing_email = Column(String(255), nullable=True)

    plan_tier = Column(String(20), nullable=True)
    billing_interval = Column(String(10), nullable=True)
    credit_amount = Column(Integer, nullable=True)

    billing_period_start = Column(DateTime, nullable=True)
    billing_period_end = Column(DateTime, nullable=True)

    issued_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    paid_date = Column(DateTime, nullable=True)
    cancelled_date = Column(DateTime, nullable=True)

    payment_id = Column(Integer, ForeignKey("razorpay_payments.id", ondelete="SET NULL"), nullable=True)
    subscription_id = Column(Integer, ForeignKey("tenant_subscriptions.id", ondelete="SET NULL"), nullable=True)

    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)

    pdf_path = Column(String(500), nullable=True)
    receipt_pdf_path = Column(String(500), nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", foreign_keys=[organization_id])
    user = relationship("User", foreign_keys=[user_id])
    payment = relationship("RazorpayPayment", foreign_keys=[payment_id])


class FailedPaymentLog(Base):
    __tablename__ = "failed_payment_logs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_id = Column(Integer, ForeignKey("razorpay_payments.id", ondelete="SET NULL"), nullable=True)

    razorpay_order_id = Column(String(100), nullable=True, index=True)
    razorpay_payment_id = Column(String(100), nullable=True, index=True)

    amount = Column(Integer, default=0)
    currency = Column(String(3), default="INR")
    payment_type = Column(String(30), nullable=True)

    error_code = Column(String(100), nullable=True)
    error_description = Column(Text, nullable=True)
    failure_reason = Column(String(255), nullable=True)

    attempt_count = Column(Integer, default=1)
    resolved = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    organization = relationship("Organization", foreign_keys=[organization_id])
    payment = relationship("RazorpayPayment", foreign_keys=[payment_id])
