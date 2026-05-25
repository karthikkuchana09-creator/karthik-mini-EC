import json
import hashlib
import hmac
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.log import get_logger
from app.models.payment import (
    RazorpayPayment, RazorpaySubscriptionLink, RazorpayInvoice,
    PaymentStatus, PaymentType,
)
from app.models.subscription import SubscriptionPlan, TenantSubscription, BillingHistory, SubscriptionStatus, BillingInterval
from app.models.organization import Organization
from app.services.subscription_service import SubscriptionService
from app.services.credit_service import CreditService, PLAN_CREDIT_ALLOCATIONS
from app.core.tenant import TenantResolver

logger = get_logger("razorpay_service")

PAYMENT_AMOUNTS: dict[str, dict] = {
    "silver": {"monthly": 2900, "yearly": 29000},
    "gold": {"monthly": 9900, "yearly": 99000},
}

CREDIT_PRICES: dict[int, int] = {
    100: 19900,
    500: 89900,
    1000: 159900,
    5000: 699900,
}


def _get_razorpay_client():
    import razorpay
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


class RazorpayService:

    @staticmethod
    def create_order(
        db: Session,
        org_id: int,
        user_id: int,
        amount_inr: int,
        payment_type: str,
        plan_tier: Optional[str] = None,
        billing_interval: Optional[str] = None,
        credit_amount: Optional[int] = None,
    ) -> dict:
        client = _get_razorpay_client()
        amount_paise = amount_inr * 100
        receipt = f"rcpt_{org_id}_{int(datetime.utcnow().timestamp())}"

        notes = {
            "org_id": str(org_id),
            "user_id": str(user_id),
            "payment_type": payment_type,
        }
        if plan_tier:
            notes["plan_tier"] = plan_tier
        if billing_interval:
            notes["billing_interval"] = billing_interval
        if credit_amount:
            notes["credit_amount"] = str(credit_amount)

        razorpay_order = client.order.create({
            "amount": amount_paise,
            "currency": settings.RAZORPAY_CURRENCY,
            "receipt": receipt,
            "notes": notes,
        })

        payment = RazorpayPayment(
            organization_id=org_id,
            user_id=user_id,
            razorpay_order_id=razorpay_order["id"],
            amount=amount_paise,
            currency=settings.RAZORPAY_CURRENCY,
            status=PaymentStatus.created.value,
            payment_type=payment_type,
            plan_tier=plan_tier,
            billing_interval=billing_interval,
            credit_amount=credit_amount,
            receipt=receipt,
            notes_json=json.dumps(notes),
        )
        db.add(payment)
        db.commit()

        logger.info(
            "Created Razorpay order %s for org_id=%d type=%s amount=%d",
            razorpay_order["id"], org_id, payment_type, amount_paise,
        )

        return {
            "razorpay_order_id": razorpay_order["id"],
            "amount": amount_inr,
            "amount_paise": amount_paise,
            "currency": settings.RAZORPAY_CURRENCY,
            "key_id": settings.RAZORPAY_KEY_ID,
            "receipt": receipt,
            "prefill": {},
        }

    @staticmethod
    def verify_payment(
        db: Session,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> dict:
        payment_record = db.scalar(select(RazorpayPayment).where(
            RazorpayPayment.razorpay_order_id == order_id,
        ))

        if not payment_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order {order_id} not found",
            )

        expected_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            f"{order_id}|{payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, signature):
            payment_record.status = PaymentStatus.failed.value
            payment_record.error_description = "Signature verification failed"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment signature verification failed",
            )

        client = _get_razorpay_client()
        try:
            rzp_payment = client.payment.fetch(payment_id)
            payment_status = rzp_payment.get("status", "failed")
            amount_paid = rzp_payment.get("amount", 0)
        except Exception:
            payment_status = "captured"
            amount_paid = payment_record.amount

        payment_record.razorpay_payment_id = payment_id
        payment_record.razorpay_signature = signature
        payment_record.amount_paid = amount_paid
        payment_record.status = PaymentStatus.captured.value

        result = {"success": True, "message": "Payment verified successfully"}

        payment_type = payment_record.payment_type
        org_id = payment_record.organization_id

        if payment_type == PaymentType.plan_purchase.value:
            plan_tier = payment_record.plan_tier or "silver"
            billing_interval = payment_record.billing_interval or "monthly"
            try:
                new_sub, prev_plan, new_plan = SubscriptionService.change_plan(
                    db, org_id, plan_tier, billing_interval,
                )
                result["plan_tier"] = plan_tier
                result["message"] = f"Subscription upgraded to {new_plan.name}"
                logger.info(
                    "Plan upgraded to %s for org_id=%d via Razorpay payment %s",
                    plan_tier, org_id, payment_id,
                )
            except Exception as exc:
                logger.error("Plan upgrade failed after payment %s: %s", payment_id, exc)
                result["message"] = "Payment verified but plan upgrade failed. Contact support."

        elif payment_type == PaymentType.credit_topup.value:
            credit_amount = payment_record.credit_amount or 100
            try:
                CreditService.add_credits(
                    db=db,
                    org_id=org_id,
                    credits=credit_amount,
                    transaction_type="purchase",
                    description=f"Purchased {credit_amount} credits via Razorpay",
                    user_id=payment_record.user_id,
                )
                result["credits_added"] = credit_amount
                result["message"] = f"{credit_amount} credits added to your account"
                logger.info(
                    "Added %d credits for org_id=%d via Razorpay payment %s",
                    credit_amount, org_id, payment_id,
                )
            except Exception as exc:
                logger.error("Credit topup failed after payment %s: %s", payment_id, exc)
                result["message"] = "Payment verified but credit addition failed. Contact support."

        billing = BillingHistory(
            organization_id=org_id,
            event_type="payment",
            description=f"Razorpay payment {payment_id} for {payment_type}",
            amount=amount_paid,
            currency=settings.RAZORPAY_CURRENCY,
        )
        db.add(billing)
        db.commit()

        result["payment_id"] = payment_id
        return result

    @staticmethod
    def create_subscription_link(
        db: Session,
        org_id: int,
        user_id: int,
        plan_tier: str,
        billing_interval: str = "monthly",
    ) -> dict:
        plan = SubscriptionService.get_plan_by_tier(db, plan_tier)
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan '{plan_tier}' not found")

        amount_map = PAYMENT_AMOUNTS.get(plan_tier, {})
        amount_paise = amount_map.get(billing_interval, plan.price_monthly * 100)
        if billing_interval == "yearly":
            amount_paise = amount_map.get("yearly", plan.price_yearly * 100)

        client = _get_razorpay_client()
        period_count = 12 if billing_interval == "yearly" else 0

        rzp_subscription = client.subscription.create({
            "plan_id": None,
            "total_count": period_count,
            "quantity": 1,
            "customer_notify": 1,
            "notes": {
                "org_id": str(org_id),
                "user_id": str(user_id),
                "plan_tier": plan_tier,
                "billing_interval": billing_interval,
            },
        })

        sub_link = RazorpaySubscriptionLink(
            organization_id=org_id,
            user_id=user_id,
            razorpay_subscription_id=rzp_subscription["id"],
            plan_tier=plan_tier,
            billing_interval=billing_interval,
            status=rzp_subscription.get("status", "created"),
            short_url=rzp_subscription.get("short_url"),
            total_count=period_count,
            paid_count=0,
        )
        db.add(sub_link)
        db.commit()

        logger.info(
            "Created Razorpay subscription %s for org_id=%d plan=%s interval=%s",
            rzp_subscription["id"], org_id, plan_tier, billing_interval,
        )

        return {
            "razorpay_subscription_id": rzp_subscription["id"],
            "short_url": rzp_subscription.get("short_url", ""),
            "plan_tier": plan_tier,
            "billing_interval": billing_interval,
            "amount": amount_paise,
        }

    @staticmethod
    def verify_webhook_signature(payload: bytes, signature_header: str) -> bool:
        if not settings.RAZORPAY_WEBHOOK_SECRET:
            logger.warning("RAZORPAY_WEBHOOK_SECRET not set, skipping webhook verification")
            return True
        expected_signature = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected_signature, signature_header)

    @staticmethod
    def process_webhook_event(db: Session, event: dict) -> dict:
        event_type = event.get("event", "")
        payload = event.get("payload", {})
        logger.info("Processing Razorpay webhook event: %s", event_type)

        if event_type == "payment.captured":
            return RazorpayService._handle_payment_captured(db, payload)
        elif event_type == "payment.failed":
            return RazorpayService._handle_payment_failed(db, payload)
        elif event_type == "subscription.charged":
            return RazorpayService._handle_subscription_charged(db, payload)
        elif event_type == "subscription.activated":
            return RazorpayService._handle_subscription_activated(db, payload)
        elif event_type == "subscription.completed":
            return RazorpayService._handle_subscription_completed(db, payload)
        elif event_type == "subscription.cancelled":
            return RazorpayService._handle_subscription_cancelled(db, payload)
        elif event_type == "invoice.paid":
            return RazorpayService._handle_invoice_paid(db, payload)
        else:
            logger.info("Unhandled webhook event type: %s", event_type)
            return {"status": "ignored", "event": event_type}

    @staticmethod
    async def process_webhook_event_async(event: dict):
        """Async wrapper for sync process_webhook_event, runs in thread pool."""
        from app.db.session import SessionLocal
        def _run():
            db = SessionLocal()
            try:
                RazorpayService.process_webhook_event(db, event)
            finally:
                db.close()
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _run)

    @staticmethod
    def _handle_payment_captured(db: Session, payload: dict) -> dict:
        payment_entity = payload.get("payment", {}).get("entity", {})
        payment_id = payment_entity.get("id")
        order_id = payment_entity.get("order_id")
        amount = payment_entity.get("amount", 0)
        status = payment_entity.get("status", "captured")

        payment_record = db.scalar(select(RazorpayPayment).where(
            RazorpayPayment.razorpay_order_id == order_id,
        ))

        if payment_record:
            payment_record.razorpay_payment_id = payment_id
            payment_record.amount_paid = amount
            payment_record.status = PaymentStatus.captured.value
            db.commit()
            logger.info("Webhook: Payment %s captured for order %s", payment_id, order_id)
        else:
            logger.warning("Webhook: Order %s not found for payment %s", order_id, payment_id)

        return {"status": "processed", "event": "payment.captured", "payment_id": payment_id}

    @staticmethod
    def _handle_payment_failed(db: Session, payload: dict) -> dict:
        payment_entity = payload.get("payment", {}).get("entity", {})
        payment_id = payment_entity.get("id")
        order_id = payment_entity.get("order_id")
        error_code = payment_entity.get("error_code")
        error_description = payment_entity.get("error_description")

        payment_record = db.scalar(select(RazorpayPayment).where(
            RazorpayPayment.razorpay_order_id == order_id,
        ))

        if payment_record:
            payment_record.status = PaymentStatus.failed.value
            payment_record.error_code = error_code
            payment_record.error_description = error_description
            db.commit()
            logger.warning("Webhook: Payment %s failed: %s - %s", payment_id, error_code, error_description)

        return {"status": "processed", "event": "payment.failed", "payment_id": payment_id}

    @staticmethod
    def _handle_subscription_charged(db: Session, payload: dict) -> dict:
        sub_entity = payload.get("subscription", {}).get("entity", {})
        rzp_sub_id = sub_entity.get("id")
        status = sub_entity.get("status", "")
        current_start = sub_entity.get("current_start")
        current_end = sub_entity.get("current_end")
        paid_count = sub_entity.get("paid_count", 0)

        sub_link = db.scalar(select(RazorpaySubscriptionLink).where(
            RazorpaySubscriptionLink.razorpay_subscription_id == rzp_sub_id,
        ))

        if not sub_link:
            logger.warning("Webhook: Subscription %s not found in DB", rzp_sub_id)
            return {"status": "ignored", "reason": "subscription_not_found"}

        sub_link.status = status
        sub_link.paid_count = paid_count
        if current_start:
            sub_link.current_start = datetime.fromtimestamp(current_start)
        if current_end:
            sub_link.current_end = datetime.fromtimestamp(current_end)
        db.commit()

        payment_entity = payload.get("payment", {}).get("entity", {})
        payment_id = payment_entity.get("id")
        amount = payment_entity.get("amount", 0)

        invoice_entity = payload.get("invoice", {}).get("entity", {})
        invoice_id = invoice_entity.get("id") if invoice_entity else None

        if invoice_id:
            inv = RazorpayInvoice(
                organization_id=sub_link.organization_id,
                razorpay_invoice_id=invoice_id,
                razorpay_subscription_id=rzp_sub_id,
                razorpay_payment_id=payment_id,
                amount=amount,
                amount_paid=amount,
                currency=settings.RAZORPAY_CURRENCY,
                status="paid",
                period_start=sub_link.current_start,
                period_end=sub_link.current_end,
                paid_at=datetime.utcnow(),
            )
            db.add(inv)

        self_sub = None
        if sub_link.tenant_subscription_id:
            self_sub = db.scalar(select(TenantSubscription).where(
                TenantSubscription.id == sub_link.tenant_subscription_id,
            ))

        if self_sub:
            period_days = 30 if sub_link.billing_interval == "monthly" else 365
            self_sub.current_period_start = datetime.utcnow()
            self_sub.current_period_end = datetime.utcnow() + timedelta(days=period_days)
            if self_sub.status != SubscriptionStatus.active:
                self_sub.status = SubscriptionStatus.active
            db.commit()

        billing = BillingHistory(
            organization_id=sub_link.organization_id,
            event_type="subscription_renewal",
            description=f"Subscription {rzp_sub_id} charged {amount} {settings.RAZORPAY_CURRENCY}",
            amount=amount,
            currency=settings.RAZORPAY_CURRENCY,
            interval=sub_link.billing_interval,
        )
        db.add(billing)
        db.commit()

        logger.info("Webhook: Subscription %s charged successfully", rzp_sub_id)
        return {"status": "processed", "event": "subscription.charged", "subscription_id": rzp_sub_id}

    @staticmethod
    def _handle_subscription_activated(db: Session, payload: dict) -> dict:
        sub_entity = payload.get("subscription", {}).get("entity", {})
        rzp_sub_id = sub_entity.get("id")

        sub_link = db.scalar(select(RazorpaySubscriptionLink).where(
            RazorpaySubscriptionLink.razorpay_subscription_id == rzp_sub_id,
        ))

        if sub_link:
            sub_link.status = "active"
            db.commit()

            if not sub_link.tenant_subscription_id:
                try:
                    new_sub, prev_plan, new_plan = SubscriptionService.change_plan(
                        db, sub_link.organization_id, sub_link.plan_tier, sub_link.billing_interval,
                    )
                    sub_link.tenant_subscription_id = new_sub.id
                    db.commit()
                    logger.info(
                        "Activated plan %s for org_id=%d via subscription %s",
                        sub_link.plan_tier, sub_link.organization_id, rzp_sub_id,
                    )
                except Exception as exc:
                    logger.error("Failed to activate plan for subscription %s: %s", rzp_sub_id, exc)

        return {"status": "processed", "event": "subscription.activated", "subscription_id": rzp_sub_id}

    @staticmethod
    def _handle_subscription_completed(db: Session, payload: dict) -> dict:
        sub_entity = payload.get("subscription", {}).get("entity", {})
        rzp_sub_id = sub_entity.get("id")

        sub_link = db.scalar(select(RazorpaySubscriptionLink).where(
            RazorpaySubscriptionLink.razorpay_subscription_id == rzp_sub_id,
        ))

        if sub_link:
            sub_link.status = "completed"
            db.commit()

        return {"status": "processed", "event": "subscription.completed", "subscription_id": rzp_sub_id}

    @staticmethod
    def _handle_subscription_cancelled(db: Session, payload: dict) -> dict:
        sub_entity = payload.get("subscription", {}).get("entity", {})
        rzp_sub_id = sub_entity.get("id")

        sub_link = db.scalar(select(RazorpaySubscriptionLink).where(
            RazorpaySubscriptionLink.razorpay_subscription_id == rzp_sub_id,
        ))

        if sub_link:
            sub_link.status = "cancelled"
            db.commit()

            if sub_link.tenant_subscription_id:
                try:
                    self_sub = db.scalar(select(TenantSubscription).where(
                        TenantSubscription.id == sub_link.tenant_subscription_id,
                    ))
                    if self_sub:
                        self_sub.auto_renew = False
                        db.commit()
                except Exception as exc:
                    logger.error("Failed to update auto_renew for sub %s: %s", rzp_sub_id, exc)

        return {"status": "processed", "event": "subscription.cancelled", "subscription_id": rzp_sub_id}

    @staticmethod
    def _handle_invoice_paid(db: Session, payload: dict) -> dict:
        invoice_entity = payload.get("invoice", {}).get("entity", {})
        invoice_id = invoice_entity.get("id")
        amount = invoice_entity.get("amount", 0)
        status = invoice_entity.get("status", "paid")
        invoice_url = invoice_entity.get("invoice_url")
        pdf_url = invoice_entity.get("pdf_url")
        rzp_sub_id = invoice_entity.get("subscription_id")
        payment_id = invoice_entity.get("payment_id")
        order_id = invoice_entity.get("order_id")

        existing = db.scalar(select(RazorpayInvoice).where(
            RazorpayInvoice.razorpay_invoice_id == invoice_id,
        ))

        if existing:
            existing.status = status
            existing.amount_paid = amount
            existing.paid_at = datetime.utcnow()
            db.commit()
            return {"status": "updated", "event": "invoice.paid", "invoice_id": invoice_id}

        org_id = None
        if rzp_sub_id:
            sub_link = db.scalar(select(RazorpaySubscriptionLink).where(
                RazorpaySubscriptionLink.razorpay_subscription_id == rzp_sub_id,
            ))
            if sub_link:
                org_id = sub_link.organization_id

        if not org_id and order_id:
            payment_rec = db.scalar(select(RazorpayPayment).where(
                RazorpayPayment.razorpay_order_id == order_id,
            ))
            if payment_rec:
                org_id = payment_rec.organization_id

        if org_id:
            inv = RazorpayInvoice(
                organization_id=org_id,
                razorpay_invoice_id=invoice_id,
                razorpay_subscription_id=rzp_sub_id,
                razorpay_payment_id=payment_id,
                order_id=order_id,
                amount=amount,
                amount_paid=amount,
                currency=settings.RAZORPAY_CURRENCY,
                status="paid",
                invoice_url=invoice_url,
                pdf_url=pdf_url,
                paid_at=datetime.utcnow(),
            )
            db.add(inv)
            db.commit()
            logger.info("Webhook: Invoice %s paid for org_id=%d", invoice_id, org_id)

        return {"status": "processed", "event": "invoice.paid", "invoice_id": invoice_id}

    @staticmethod
    def get_payment_history(
        db: Session,
        org_id: int,
        skip: int = 0,
        limit: int = 20,
    ) -> dict:
        total = db.scalar(select(func.count(RazorpayPayment.id)).where(
            RazorpayPayment.organization_id == org_id,
        ))

        items = db.execute(select(RazorpayPayment).where(
            RazorpayPayment.organization_id == org_id,
        ).order_by(RazorpayPayment.created_at.desc()).offset(skip).limit(limit)).scalars().all()

        return {
            "items": items,
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "size": limit,
        }

    @staticmethod
    def get_invoices(
        db: Session,
        org_id: int,
        skip: int = 0,
        limit: int = 20,
    ) -> dict:
        total = db.scalar(select(func.count(RazorpayInvoice.id)).where(
            RazorpayInvoice.organization_id == org_id,
        ))

        items = db.execute(select(RazorpayInvoice).where(
            RazorpayInvoice.organization_id == org_id,
        ).order_by(RazorpayInvoice.created_at.desc()).offset(skip).limit(limit)).scalars().all()

        return {
            "items": items,
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "size": limit,
        }
