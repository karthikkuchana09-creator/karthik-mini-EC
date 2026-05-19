from datetime import datetime, timedelta
from typing import Any, Callable, Optional

from sqlalchemy.orm import Session

from app.core.cache import cache_get, cache_set, cache_delete_pattern, _get_backend
from app.core.config import settings
from app.core.log import get_logger
from app.ai.services import AIService
from app.services.dashboard_service import get_enterprise_ai_summary

logger = get_logger("ai.cache")


class AICacheService:
    PREFIX = "ai:"

    CACHE_TTL = {
        "summary": settings.CACHE_TTL_AI,
        "analytics": settings.CACHE_TTL_AI,
        "recommendations": settings.CACHE_TTL_AI,
        "performance": settings.CACHE_TTL_AI * 2,
        "workload": settings.CACHE_TTL_AI,
        "productivity": settings.CACHE_TTL_AI * 2,
        "intelligence": settings.CACHE_TTL_AI,
        "dashboard": settings.CACHE_TTL_DASHBOARD,
    }

    @staticmethod
    def key(*parts: str) -> str:
        return f"{AICacheService.PREFIX}{':'.join(parts)}"

    @staticmethod
    async def get_or_compute(key: str, ttl: int, compute: Callable, *args, **kwargs) -> Any:
        cached = await cache_get(key)
        if cached is not None:
            return cached
        result = compute(*args, **kwargs) if callable(compute) else compute
        await cache_set(key, result, ttl)
        return result

    @staticmethod
    async def warm_ai_caches(db: Session) -> dict[str, float]:
        logger.info("Warming AI caches...")
        started = datetime.utcnow()
        svc = AIService(db)
        ops = {}

        summary = get_enterprise_ai_summary(db)
        await cache_set(AICacheService.key("enterprise", "summary"), summary, settings.CACHE_TTL_AI)
        ops["enterprise_summary"] = 1

        recommendations = svc.get_recommendations()
        await cache_set(AICacheService.key("recommendations"), recommendations, settings.CACHE_TTL_AI)
        ops["recommendations"] = len(recommendations.get("recommendations", []))

        performance = svc.get_performance_analytics()
        await cache_set(AICacheService.key("performance"), performance, settings.CACHE_TTL_AI * 2)
        ops["performance"] = len(performance.get("users", []))

        workload = svc.get_workload_analysis()
        await cache_set(AICacheService.key("workload"), workload, settings.CACHE_TTL_AI)
        ops["workload"] = workload.get("team_balance", {}).get("total_employees", 0)

        productivity = svc.get_employee_productivity()
        await cache_set(AICacheService.key("productivity"), productivity, settings.CACHE_TTL_AI * 2)
        ops["productivity"] = productivity.get("total_employees", 0)

        intelligence = svc.get_team_intelligence()
        await cache_set(AICacheService.key("intelligence"), intelligence, settings.CACHE_TTL_AI)
        ops["intelligence"] = intelligence.get("team_workload", {}).get("total_employees", 0)

        elapsed = (datetime.utcnow() - started).total_seconds()
        logger.info("AI caches warmed: %d ops in %.2fs", len(ops), elapsed)
        return {"elapsed": elapsed, "ops": ops}

    @staticmethod
    async def invalidate_ai_caches() -> int:
        patterns = [
            AICacheService.key("*"),
        ]
        count = 0
        for pattern in patterns:
            try:
                await cache_delete_pattern(pattern)
                count += 1
            except Exception as exc:
                logger.warning("Cache invalidation error for %s: %s", pattern, exc)
        logger.info("AI caches invalidated: %d patterns", count)
        return count

    @staticmethod
    async def get_cache_stats() -> dict:
        backend = _get_backend()
        backend_name = type(backend).__name__.replace("Backend", "")
        return {
            "backend": backend_name,
            "redis_url": settings.REDIS_URL if settings.REDIS_URL else None,
            "ttl_default": settings.CACHE_TTL_DEFAULT,
            "ttl_ai": settings.CACHE_TTL_AI,
            "ttl_dashboard": settings.CACHE_TTL_DASHBOARD,
            "caches": {k: v for k, v in AICacheService.CACHE_TTL.items()},
        }
