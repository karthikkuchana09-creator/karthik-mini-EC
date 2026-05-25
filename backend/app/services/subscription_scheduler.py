from __future__ import annotations
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.core.background_tasks import task_queue, BackgroundTask, TaskPriority
from app.core.config import settings
from app.core.log import get_logger

logger = get_logger("subscription_scheduler")


class SubscriptionScheduler:

    @staticmethod
    async def check_expired():
        from app.db.session import SessionLocal
        from app.models.subscription import TenantSubscription, SubscriptionStatus
        from app.services.subscription_service import SubscriptionService

        db = SessionLocal()
        try:
            now = datetime.utcnow()
            expired = db.execute(select(TenantSubscription).where(
                TenantSubscription.status == SubscriptionStatus.active.value,
                TenantSubscription.current_period_end < now,
                TenantSubscription.is_active == True,
            )).scalars().all()

            for sub in expired:
                if sub.auto_renew:
                    logger.info("Auto-renewing subscription %d for org %d",
                                sub.id, sub.organization_id)
                    sub.status = SubscriptionStatus.expired.value
                    sub.is_active = False
                    sub.ended_at = now
                    db.flush()
                    await task_queue.enqueue(
                        BackgroundTask(
                            name=f"auto_renew_{sub.id}",
                            coro=SubscriptionService.change_plan,
                            args=(sub.organization_id, sub.plan.tier if hasattr(sub.plan, 'tier') else sub.plan_id),
                            kwargs={"billing_interval": sub.billing_interval.value if hasattr(sub.billing_interval, 'value') else sub.billing_interval},
                            priority=TaskPriority.HIGH,
                            max_retries=3,
                            retry_delay=30.0,
                            timeout=60.0,
                        )
                    )
                else:
                    sub.status = SubscriptionStatus.expired.value
                    sub.is_active = False
                    sub.ended_at = now
                    logger.info("Marked subscription %d as expired", sub.id)

            db.commit()
            if expired:
                logger.info("Processed %d expired subscriptions", len(expired))
        except Exception as exc:
            logger.error("check_expired error: %s", exc)
            db.rollback()
        finally:
            db.close()

    @staticmethod
    async def check_past_due():
        """Check for subscriptions approaching expiry and notify."""
        from app.db.session import SessionLocal
        from app.models.subscription import TenantSubscription, SubscriptionStatus

        db = SessionLocal()
        try:
            warning_days = 7
            now = datetime.utcnow()
            threshold = now + timedelta(days=warning_days)

            approaching = db.execute(select(TenantSubscription).where(
                TenantSubscription.status == SubscriptionStatus.active.value,
                TenantSubscription.current_period_end <= threshold,
                TenantSubscription.current_period_end > now,
                TenantSubscription.is_active == True,
            )).scalars().all()

            for sub in approaching:
                days_left = (sub.current_period_end - now).days
                logger.info("Subscription %d for org %d expires in %d days",
                            sub.id, sub.organization_id, days_left)
                from app.models.notification import Notification
                notification = Notification(
                    user_id=None,
                    tenant_id=sub.organization_id,
                    title="Subscription Expiring Soon",
                    message=f"Your subscription will expire in {days_left} days. Renew to avoid service interruption.",
                    notification_type="subscription",
                    is_read=False,
                )
                db.add(notification)

            if approaching:
                db.commit()
                logger.info("Created %d expiry warnings", len(approaching))
        except Exception as exc:
            logger.error("check_past_due error: %s", exc)
            db.rollback()
        finally:
            db.close()

    @staticmethod
    async def run_all():
        await SubscriptionScheduler.check_expired()
        await SubscriptionScheduler.check_past_due()


class BillingProcessor:

    @staticmethod
    async def process_invoice_generation():
        """Generate invoices for recently completed payments."""
        from app.db.session import SessionLocal
        from app.models.payment import RazorpayPayment, PaymentStatus
        from app.models.invoice import Invoice
        from app.services.invoice_service import InvoiceService

        db = SessionLocal()
        try:
            unprocessed = db.execute(select(RazorpayPayment).where(
                RazorpayPayment.status == PaymentStatus.captured.value,
            ).outerjoin(
                Invoice, Invoice.payment_id == RazorpayPayment.id,
            ).where(
                Invoice.id.is_(None),
            ).limit(50)).scalars().all()

            generated = 0
            for payment in unprocessed:
                try:
                    InvoiceService.generate_from_payment(db, payment.id)
                    generated += 1
                except Exception as exc:
                    logger.warning("Invoice generation failed for payment %d: %s",
                                   payment.id, exc)

            if generated:
                db.commit()
                logger.info("Generated %d invoices from unprocessed payments", generated)
        except Exception as exc:
            logger.error("process_invoice_generation error: %s", exc)
            db.rollback()
        finally:
            db.close()

    @staticmethod
    async def run_all():
        await BillingProcessor.process_invoice_generation()


async def run_scheduled_checks():
    """Run all scheduled maintenance tasks."""
    logger.info("Running scheduled maintenance checks...")
    await SubscriptionScheduler.run_all()
    await BillingProcessor.run_all()
    logger.info("Scheduled maintenance checks complete")
