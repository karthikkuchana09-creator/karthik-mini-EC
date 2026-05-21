from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base


class PaymentStatus(str, enum.Enum):
    created = "created"
    attempted = "attempted"
    captured = "captured"
    failed = "failed"
    refunded = "refunded"


class PaymentType(str, enum.Enum):
    plan_purchase = "plan_purchase"
    credit_topup = "credit_topup"
    subscription_recurring = "subscription_recurring"


class RazorpayPayment(Base):
    __tablename__ = "razorpay_payments"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    razorpay_order_id = Column(String(100), unique=True, nullable=False, index=True)
    razorpay_payment_id = Column(String(100), nullable=True, index=True)
    razorpay_signature = Column(String(255), nullable=True)

    amount = Column(Integer, nullable=False)
    amount_paid = Column(Integer, default=0)
    currency = Column(String(3), default="INR")
    status = Column(String(20), default=PaymentStatus.created.value, nullable=False)

    payment_type = Column(String(30), nullable=False)
    plan_tier = Column(String(20), nullable=True)
    billing_interval = Column(String(10), nullable=True)
    credit_amount = Column(Integer, nullable=True)

    invoice_id = Column(String(100), nullable=True)
    receipt = Column(String(100), nullable=True)
    error_code = Column(String(100), nullable=True)
    error_description = Column(Text, nullable=True)
    notes_json = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", foreign_keys=[organization_id])
    user = relationship("User", foreign_keys=[user_id])


class RazorpaySubscriptionLink(Base):
    __tablename__ = "razorpay_subscription_links"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tenant_subscription_id = Column(Integer, ForeignKey("tenant_subscriptions.id", ondelete="SET NULL"), nullable=True)

    razorpay_subscription_id = Column(String(100), unique=True, nullable=False, index=True)
    plan_tier = Column(String(20), nullable=False)
    billing_interval = Column(String(10), nullable=False)
    status = Column(String(20), default="created", nullable=False)
    short_url = Column(String(500), nullable=True)

    current_start = Column(DateTime, nullable=True)
    current_end = Column(DateTime, nullable=True)
    total_count = Column(Integer, default=0)
    paid_count = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", foreign_keys=[organization_id])
    user = relationship("User", foreign_keys=[user_id])
    tenant_subscription = relationship("TenantSubscription", foreign_keys=[tenant_subscription_id])


class RazorpayInvoice(Base):
    __tablename__ = "razorpay_invoices"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    razorpay_invoice_id = Column(String(100), unique=True, nullable=False, index=True)
    razorpay_subscription_id = Column(String(100), nullable=True, index=True)
    razorpay_payment_id = Column(String(100), nullable=True, index=True)
    order_id = Column(String(100), nullable=True)

    amount = Column(Integer, nullable=False)
    amount_paid = Column(Integer, default=0)
    currency = Column(String(3), default="INR")
    status = Column(String(20), nullable=False)

    invoice_url = Column(String(500), nullable=True)
    pdf_url = Column(String(500), nullable=True)

    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    paid_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", foreign_keys=[organization_id])
