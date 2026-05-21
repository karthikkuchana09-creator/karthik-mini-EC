from __future__ import annotations
import asyncio
import json
from typing import Any, Optional
from datetime import datetime, timedelta
from app.core.redis_client import (
    tenant_key, global_key, cache_get, cache_set, cache_delete,
    cache_delete_pattern, invalidate_tenant,
)
from app.core.config import settings
from app.core.log import get_logger

logger = get_logger("tenant_cache")


class TenantCacheService:

    CACHE_PREFIXES = {
        "org": "org",
        "settings": "settings",
        "subscription": "sub",
        "plan": "plan",
        "credits": "credits",
        "usage": "usage",
        "dashboard": "dash",
        "members": "members",
    }

    @staticmethod
    async def get(tenant_id: int, cache_type: str, key: str) -> Optional[str]:
        full_key = tenant_key(tenant_id, cache_type, key)
        return await cache_get(full_key)

    @staticmethod
    async def set(tenant_id: int, cache_type: str, key: str, value: str,
                  ttl: Optional[int] = None):
        full_key = tenant_key(tenant_id, cache_type, key)
        if ttl is None:
            ttl_map = {
                "org": 600, "settings": 600, "subscription": 120,
                "plan": 600, "credits": 60, "usage": 60,
                "dashboard": settings.CACHE_TTL_DASHBOARD,
                "members": 120,
            }
            ttl = ttl_map.get(cache_type, settings.CACHE_TTL_DEFAULT)
        await cache_set(full_key, value, ttl)

    @staticmethod
    async def delete(tenant_id: int, cache_type: str, key: str):
        full_key = tenant_key(tenant_id, cache_type, key)
        await cache_delete(full_key)

    @staticmethod
    async def invalidate_all(tenant_id: int):
        count = await invalidate_tenant(tenant_id)
        logger.debug("Invalidated %d cache keys for tenant %d", count, tenant_id)

    @staticmethod
    async def invalidate_type(tenant_id: int, cache_type: str):
        pattern = tenant_key(tenant_id, cache_type, "*")
        count = await cache_delete_pattern(pattern)
        if count:
            logger.debug("Invalidated %d keys for tenant %d type=%s", count, tenant_id, cache_type)

    @staticmethod
    def get_sync(tenant_id: int, cache_type: str, key: str) -> Optional[str]:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                return None
            return loop.run_until_complete(
                TenantCacheService.get(tenant_id, cache_type, key)
            )
        except RuntimeError:
            return None

    @staticmethod
    def set_sync(tenant_id: int, cache_type: str, key: str, value: str,
                 ttl: Optional[int] = None):
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                return
            loop.run_until_complete(
                TenantCacheService.set(tenant_id, cache_type, key, value, ttl)
            )
        except RuntimeError:
            pass


class CacheWarmer:
    @staticmethod
    async def warm_tenant(tenant_id: int):
        """Pre-warm critical caches for a tenant."""
        from app.db.session import SessionLocal
        from app.services.organization_service import OrganizationService
        from app.services.subscription_service import SubscriptionService

        db = SessionLocal()
        try:
            org = OrganizationService.get_organization(db, tenant_id)
            if org:
                data = {"id": org.id, "name": org.name, "slug": org.slug,
                        "plan": getattr(org, 'subscription_plan', None), "is_active": org.is_active}
                await TenantCacheService.set(
                    tenant_id, "org", "info",
                    json.dumps(data, default=str), ttl=600,
                )

            sub = SubscriptionService.get_or_create_subscription(db, tenant_id)
            if sub:
                plan = SubscriptionService.get_plan_by_id(db, sub.plan_id)
                data = {
                    "plan_tier": plan.tier if plan else None,
                    "status": sub.status,
                    "days_remaining": getattr(sub, 'days_remaining', None),
                }
                await TenantCacheService.set(
                    tenant_id, "subscription", "current",
                    json.dumps(data, default=str), ttl=120,
                )

            logger.debug("Warmed caches for tenant %d", tenant_id)
        except Exception as exc:
            logger.warning("Cache warm failed for tenant %d: %s", tenant_id, exc)
        finally:
            db.close()
