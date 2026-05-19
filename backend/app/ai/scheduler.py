from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.core.log import get_logger
from app.db.session import SessionLocal
from app.ai.cache import AICacheService
from app.services.ai_jobs import run_ai_jobs
from app.core.config import settings

logger = get_logger("ai.scheduler")


class AIScheduler:
    _instance: Optional["AIScheduler"] = None

    def __init__(self):
        self._aps = None
        self._running = False

    @classmethod
    def get_instance(cls) -> "AIScheduler":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_db(self) -> Session:
        return SessionLocal()

    def _warm_caches_job(self):
        logger.info("Scheduled job: warming AI caches")
        try:
            db = self._get_db()
            try:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(AICacheService.warm_ai_caches(db))
                loop.close()
                logger.info("Cache warm complete: %.2fs", result.get("elapsed", 0))
            finally:
                db.close()
        except Exception as exc:
            logger.error("Cache warm job failed: %s", exc)

    def _ai_jobs_hourly(self):
        logger.info("Scheduled job: hourly AI processing")
        try:
            db = self._get_db()
            try:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(run_ai_jobs(db))
                loop.close()
                logger.info("Hourly AI jobs complete: %s", result)
            finally:
                db.close()
        except Exception as exc:
            logger.error("Hourly AI jobs failed: %s", exc)

    def _ai_jobs_daily(self):
        logger.info("Scheduled job: daily AI processing")
        try:
            db = self._get_db()
            try:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(run_ai_jobs(db, full=True))
                loop.close()
                logger.info("Daily AI jobs complete: %s", result)
            finally:
                db.close()
        except Exception as exc:
            logger.error("Daily AI jobs failed: %s", exc)

    def _cleanup_cache_job(self):
        logger.info("Scheduled job: cache cleanup")
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            count = loop.run_until_complete(AICacheService.invalidate_ai_caches())
            loop.close()
            logger.info("Cache cleanup: %d patterns invalidated", count)

            db = self._get_db()
            try:
                loop2 = asyncio.new_event_loop()
                asyncio.set_event_loop(loop2)
                result = loop2.run_until_complete(AICacheService.warm_ai_caches(db))
                loop2.close()
                logger.info("Cache re-warm complete: %.2fs", result.get("elapsed", 0))
            finally:
                db.close()
        except Exception as exc:
            logger.error("Cache cleanup job failed: %s", exc)

    def start(self):
        if self._running:
            logger.warning("AIScheduler already running")
            return
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.interval import IntervalTrigger
            from apscheduler.triggers.cron import CronTrigger

            self._aps = BackgroundScheduler(daemon=True)
            self._aps.add_job(
                self._warm_caches_job,
                IntervalTrigger(hours=1),
                id="warm_ai_caches",
                name="Warm AI caches",
                replace_existing=True,
            )
            self._aps.add_job(
                self._ai_jobs_hourly,
                IntervalTrigger(hours=1),
                id="ai_jobs_hourly",
                name="Hourly AI jobs",
                replace_existing=True,
            )
            self._aps.add_job(
                self._ai_jobs_daily,
                CronTrigger(hour=3, minute=0),
                id="ai_jobs_daily",
                name="Daily AI jobs",
                replace_existing=True,
            )
            self._aps.add_job(
                self._cleanup_cache_job,
                CronTrigger(hour=4, minute=30),
                id="cleanup_cache",
                name="Cache cleanup & re-warm",
                replace_existing=True,
            )
            self._aps.start()
            self._running = True
            logger.info("AIScheduler started: hourly warm, daily full, daily cache cleanup")
        except ImportError:
            logger.warning("APScheduler not installed — AI scheduler disabled")
        except Exception as exc:
            logger.error("Failed to start AIScheduler: %s", exc)

    def stop(self):
        if self._aps and self._running:
            self._aps.shutdown(wait=False)
            self._running = False
            logger.info("AIScheduler stopped")


def start_ai_scheduler():
    AIScheduler.get_instance().start()


def stop_ai_scheduler():
    AIScheduler.get_instance().stop()
