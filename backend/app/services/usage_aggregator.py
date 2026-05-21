from __future__ import annotations
import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, func
from sqlalchemy.sql import func as sqlfunc
from app.db.base import Base
from app.core.log import get_logger
from app.core.config import settings

logger = get_logger("usage_aggregator")


class UsageAggregation(Base):
    __tablename__ = "usage_aggregations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, nullable=False, index=True)
    period = Column(String(7), nullable=False, index=True)
    metric = Column(String(50), nullable=False, index=True)
    value = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=sqlfunc.now())
    updated_at = Column(DateTime, server_default=sqlfunc.now(), onupdate=sqlfunc.now())


class UsageAggregator:

    @staticmethod
    async def aggregate_all():
        from app.db.session import SessionLocal
        loop = asyncio.get_event_loop()
        db = SessionLocal()
        try:
            period = datetime.utcnow().strftime("%Y-%m")
            from app.models.organization import Organization
            all_orgs = db.query(Organization.id).filter(
                Organization.is_active == True,
            ).all()
            org_ids = list({o[0] for o in all_orgs})
            db.close()

            sem = asyncio.Semaphore(10)
            async def _agg(org_id):
                async with sem:
                    await loop.run_in_executor(
                        None, UsageAggregator._aggregate_org_sync, org_id, period,
                    )

            tasks = [asyncio.create_task(_agg(oid)) for oid in org_ids]
            await asyncio.gather(*tasks, return_exceptions=True)
            logger.info("Usage aggregation complete for %d orgs (period=%s)", len(org_ids), period)
        finally:
            try:
                db.close()
            except Exception:
                pass

    @staticmethod
    def _aggregate_org_sync(org_id: int, period: str):
        from app.db.session import SessionLocal
        from app.models.credit import CreditTransaction, TransactionType
        from app.models.ai import AIAnalysis
        from app.models.invoice import Invoice, InvoiceStatus
        from app.models.task import Task

        db = SessionLocal()
        try:
            agg = {}
            credits_used = db.query(
                func.coalesce(func.sum(CreditTransaction.credits_used), 0)
            ).filter(
                CreditTransaction.organization_id == org_id,
                CreditTransaction.transaction_type == TransactionType.deduction.value,
            ).scalar() or 0
            agg["credits_used"] = int(credits_used)

            ai_queries = db.query(func.count(AIAnalysis.id)).filter(
                AIAnalysis.tenant_id == org_id,
            ).scalar() or 0
            agg["ai_queries"] = ai_queries

            ai_tokens = db.query(
                func.coalesce(func.sum(AIAnalysis.tokens_used), 0)
            ).filter(
                AIAnalysis.tenant_id == org_id,
            ).scalar() or 0
            agg["ai_tokens"] = int(ai_tokens)

            revenue = db.query(
                func.coalesce(func.sum(Invoice.total_amount), 0)
            ).filter(
                Invoice.organization_id == org_id,
                Invoice.status == InvoiceStatus.paid.value,
            ).scalar() or 0
            agg["revenue_paise"] = int(revenue)

            tasks = db.query(func.count(Task.id)).filter(
                Task.tenant_id == org_id,
            ).scalar() or 0
            agg["tasks_created"] = tasks

            UsageAggregator._upsert(db, org_id, period, agg)
            db.commit()
        except Exception as exc:
            logger.error("Aggregation failed for org %d: %s", org_id, exc)
            db.rollback()
        finally:
            db.close()

    @staticmethod
    def _upsert(db: Session, org_id: int, period: str, metrics: dict):
        for metric, value in metrics.items():
            existing = db.query(UsageAggregation).filter(
                UsageAggregation.organization_id == org_id,
                UsageAggregation.period == period,
                UsageAggregation.metric == metric,
            ).first()
            if existing:
                existing.value = value
            else:
                db.add(UsageAggregation(
                    organization_id=org_id,
                    period=period,
                    metric=metric,
                    value=value,
                ))

    @staticmethod
    def get_aggregated(db: Session, org_id: int, period: str) -> dict:
        rows = db.query(UsageAggregation).filter(
            UsageAggregation.organization_id == org_id,
            UsageAggregation.period == period,
        ).all()
        return {row.metric: row.value for row in rows}

    @staticmethod
    def get_trend(db: Session, org_id: int, metric: str, months: int = 6) -> list[dict]:
        from datetime import datetime
        cutoff = (datetime.utcnow() - timedelta(days=months * 31)).strftime("%Y-%m")
        rows = db.query(UsageAggregation).filter(
            UsageAggregation.organization_id == org_id,
            UsageAggregation.metric == metric,
            UsageAggregation.period >= cutoff,
        ).order_by(UsageAggregation.period).all()
        return [{"period": r.period, "value": r.value} for r in rows]
