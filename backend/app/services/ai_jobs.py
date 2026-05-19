from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.task import Task
from app.models.approval import Approval
from app.models.comment import Comment
from app.models.user import User
from app.core.log import get_logger
from app.ai.cache import AICacheService
from app.services.ai_notification_service import run_ai_notification_cycle

logger = get_logger("ai.jobs")


async def run_ai_jobs(db: Session, full: bool = False) -> dict:
    started = datetime.utcnow()
    results = {"warmed": [], "processed": [], "elapsed": 0.0}

    notification_count = run_ai_notification_cycle(db)
    results["processed"].append({"notifications": notification_count})
    logger.info("AI notification cycle: %d notifications", notification_count)

    try:
        warm_result = await AICacheService.warm_ai_caches(db)
        results["warmed"].append(warm_result)
    except Exception as exc:
        logger.error("Cache warm failed: %s", exc)

    if full:
        try:
            await AICacheService.invalidate_ai_caches()
            results["processed"].append({"cache_invalidated": True})
            warm_result = await AICacheService.warm_ai_caches(db)
            results["warmed"].append({"full_recompute": True, **warm_result})
        except Exception as exc:
            logger.error("Full recompute failed: %s", exc)

    results["elapsed"] = round((datetime.utcnow() - started).total_seconds(), 2)
    return results


async def get_ai_job_status() -> dict:
    return {
        "status": "active",
        "interval_hours": 1,
        "full_daily": True,
        "full_daily_at": "03:00 UTC",
        "cache_cleanup_at": "04:30 UTC",
        "notification_interval_seconds": 60,
    }
