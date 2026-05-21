from __future__ import annotations
import json
import time
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from app.db.base import Base
from app.core.background_tasks import task_queue, BackgroundTask, TaskPriority
from app.core.log import get_logger

logger = get_logger("webhook_retry")


class WebhookRetryLog(Base):
    __tablename__ = "webhook_retry_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    payload = Column(JSON, nullable=True)
    razorpay_event_id = Column(String(100), nullable=True, index=True)
    status = Column(String(20), default="pending", index=True)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=5)
    last_error = Column(Text, nullable=True)
    next_retry_at = Column(DateTime, nullable=True, index=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


RETRY_BACKOFFS = [60, 300, 900, 3600, 14400]


class WebhookRetryService:

    @staticmethod
    def log_failure(db: Session, event_type: str, payload: dict,
                    error: str, event_id: Optional[str] = None,
                    max_attempts: int = 5) -> WebhookRetryLog:
        record = WebhookRetryLog(
            event_type=event_type,
            payload=payload,
            razorpay_event_id=event_id,
            status="pending",
            attempts=0,
            max_attempts=max_attempts,
            last_error=error,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        WebhookRetryService._schedule_retry(db, record)
        return record

    @staticmethod
    def _schedule_retry(db: Session, record: WebhookRetryLog):
        from datetime import timedelta
        delay = RETRY_BACKOFFS[record.attempts] if record.attempts < len(RETRY_BACKOFFS) else 14400
        record.next_retry_at = datetime.utcnow() + timedelta(seconds=delay)
        db.commit()

    @staticmethod
    async def process_retry(record_id: int):
        from app.db.session import SessionLocal
        from app.services.razorpay_service import RazorpayService

        db = SessionLocal()
        try:
            record = db.query(WebhookRetryLog).filter(WebhookRetryLog.id == record_id).first()
            if not record or record.status == "resolved":
                return

            logger.info("Processing webhook retry #%d (attempt %d/%d, event=%s)",
                        record.id, record.attempts + 1, record.max_attempts, record.event_type)

            record.attempts += 1
            raw_payload = record.payload or {}

            event_payload = {
                "event": record.event_type,
                "payload": raw_payload.get("payload", raw_payload),
            }

            HANDLED_EVENTS = {
                "payment.captured", "payment.failed",
                "subscription.charged", "subscription.activated",
                "subscription.completed", "subscription.cancelled",
                "invoice.paid",
            }

            if record.event_type not in HANDLED_EVENTS:
                logger.warning("Unknown retry event type: %s", record.event_type)
                record.status = "failed"
                db.commit()
                return

            RazorpayService.process_webhook_event(db, event_payload)

            record.status = "resolved"
            record.resolved_at = datetime.utcnow()
            record.last_error = None
            db.commit()
            logger.info("Webhook retry #%d resolved", record.id)

        except Exception as exc:
            error_msg = str(exc)
            record.last_error = error_msg
            if record.attempts >= record.max_attempts:
                record.status = "failed"
                logger.error("Webhook retry #%d exhausted (%d/%d): %s",
                             record.id, record.attempts, record.max_attempts, error_msg)
            else:
                record.status = "retrying"
                WebhookRetryService._schedule_retry(db, record)
                logger.warning("Webhook retry #%d will retry (attempt %d/%d): %s",
                               record.id, record.attempts, record.max_attempts, error_msg)
            db.commit()
        finally:
            db.close()

    @staticmethod
    async def process_pending_retries():
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            pending = db.query(WebhookRetryLog).filter(
                WebhookRetryLog.status.in_(["pending", "retrying"]),
                WebhookRetryLog.next_retry_at <= now,
                WebhookRetryLog.attempts < WebhookRetryLog.max_attempts,
            ).limit(20).all()

            for record in pending:
                await task_queue.enqueue(
                    BackgroundTask(
                        name=f"webhook_retry_{record.id}",
                        coro=WebhookRetryService.process_retry,
                        args=(record.id,),
                        priority=TaskPriority.HIGH,
                        max_retries=0,
                    )
                )
            if pending:
                logger.info("Queued %d pending webhook retries", len(pending))
        finally:
            db.close()

    @staticmethod
    def get_stats(db: Session) -> dict:
        total = db.query(func.count(WebhookRetryLog.id)).scalar() or 0
        pending = db.query(func.count(WebhookRetryLog.id)).filter(
            WebhookRetryLog.status.in_(["pending", "retrying"]),
        ).scalar() or 0
        resolved = db.query(func.count(WebhookRetryLog.id)).filter(
            WebhookRetryLog.status == "resolved",
        ).scalar() or 0
        failed = db.query(func.count(WebhookRetryLog.id)).filter(
            WebhookRetryLog.status == "failed",
        ).scalar() or 0
        return {"total": total, "pending": pending, "resolved": resolved, "failed": failed}
