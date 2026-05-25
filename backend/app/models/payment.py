from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, DateTime, Text, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
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

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    razorpay_order_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    razorpay_signature: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_paid: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[str] = mapped_column(String(20), default=PaymentStatus.created.value, nullable=False)

    payment_type: Mapped[str] = mapped_column(String(30), nullable=False)
    plan_tier: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    billing_interval: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    credit_amount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    invoice_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    receipt: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    organization: Mapped["Organization"] = relationship("Organization", foreign_keys=[organization_id])
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])


class RazorpaySubscriptionLink(Base):
    __tablename__ = "razorpay_subscription_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tenant_subscription_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tenant_subscriptions.id", ondelete="SET NULL"), nullable=True)

    razorpay_subscription_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    plan_tier: Mapped[str] = mapped_column(String(20), nullable=False)
    billing_interval: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="created", nullable=False)
    short_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    current_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    current_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    paid_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    organization: Mapped["Organization"] = relationship("Organization", foreign_keys=[organization_id])
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])
    tenant_subscription: Mapped[Optional["TenantSubscription"]] = relationship("TenantSubscription", foreign_keys=[tenant_subscription_id])


class RazorpayInvoice(Base):
    __tablename__ = "razorpay_invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    razorpay_invoice_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    razorpay_subscription_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_paid: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    invoice_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    period_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    period_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", foreign_keys=[organization_id])
