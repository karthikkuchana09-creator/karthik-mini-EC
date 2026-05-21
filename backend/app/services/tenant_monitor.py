from __future__ import annotations
import json
import time
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, func
from sqlalchemy.sql import func as sqlfunc
from app.db.base import Base
from app.core.log import get_logger

logger = get_logger("tenant_monitor")


class TenantMetric(Base):
    __tablename__ = "tenant_metrics"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, nullable=False, index=True)
    metric_name = Column(String(100), nullable=False, index=True)
    metric_value = Column(Float, default=0.0)
    recorded_at = Column(DateTime, server_default=sqlfunc.now(), index=True)


class TenantMonitor:

    @staticmethod
    def record_query_time(org_id: int, duration_ms: float, endpoint: str = ""):
        try:
            from app.db.session import SessionLocal
            db = SessionLocal()
            try:
                metric = TenantMetric(
                    organization_id=org_id,
                    metric_name=f"query_time:{endpoint}" if endpoint else "query_time",
                    metric_value=round(duration_ms, 2),
                )
                db.add(metric)
                db.commit()
            finally:
                db.close()
        except Exception as exc:
            logger.debug("Failed to record query time: %s", exc)

    @staticmethod
    def record_query_time_sync(db, org_id: int, duration_ms: float, endpoint: str = ""):
        try:
            if db is None:
                from app.db.session import SessionLocal
                db = SessionLocal()
                close_db = True
            else:
                close_db = False
            metric = TenantMetric(
                organization_id=org_id,
                metric_name=f"query_time:{endpoint}" if endpoint else "query_time",
                metric_value=round(duration_ms, 2),
            )
            db.add(metric)
            db.commit()
            if close_db:
                db.close()
        except Exception as exc:
            logger.debug("Failed to record query time sync: %s", exc)

    @staticmethod
    def get_org_metrics(db, org_id: int, metric_name: str = "query_time",
                        hours: int = 24) -> list[dict]:
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        rows = db.query(TenantMetric).filter(
            TenantMetric.organization_id == org_id,
            TenantMetric.metric_name.like(f"{metric_name}%"),
            TenantMetric.recorded_at >= cutoff,
        ).order_by(TenantMetric.recorded_at.desc()).limit(100).all()
        return [
            {"value": r.metric_value, "recorded_at": r.recorded_at.isoformat()
             if r.recorded_at else None}
            for r in rows
        ]

    @staticmethod
    def get_org_summary(db, org_id: int) -> dict:
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(hours=24)
        stats = db.query(
            func.avg(TenantMetric.metric_value).label("avg"),
            func.max(TenantMetric.metric_value).label("max"),
            func.min(TenantMetric.metric_value).label("min"),
            func.count(TenantMetric.id).label("count"),
        ).filter(
            TenantMetric.organization_id == org_id,
            TenantMetric.metric_name == "query_time",
            TenantMetric.recorded_at >= cutoff,
        ).first()
        return {
            "org_id": org_id,
            "avg_query_time_ms": round(stats.avg, 2) if stats.avg else 0,
            "max_query_time_ms": round(stats.max, 2) if stats.max else 0,
            "min_query_time_ms": round(stats.min, 2) if stats.min else 0,
            "query_count": stats.count or 0,
        }

    @staticmethod
    def get_all_orgs_summary(db, hours: int = 24) -> list[dict]:
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        rows = db.query(
            TenantMetric.organization_id,
            func.avg(TenantMetric.metric_value).label("avg_time"),
            func.max(TenantMetric.metric_value).label("max_time"),
            func.count(TenantMetric.id).label("query_count"),
        ).filter(
            TenantMetric.metric_name == "query_time",
            TenantMetric.recorded_at >= cutoff,
        ).group_by(
            TenantMetric.organization_id,
        ).order_by(
            func.avg(TenantMetric.metric_value).desc(),
        ).limit(20).all()
        return [
            {
                "org_id": r.organization_id,
                "avg_query_time_ms": round(r.avg_time, 2) if r.avg_time else 0,
                "max_query_time_ms": round(r.max_time, 2) if r.max_time else 0,
                "query_count": r.query_count or 0,
            }
            for r in rows
        ]
