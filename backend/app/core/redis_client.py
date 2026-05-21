from __future__ import annotations
import asyncio
from typing import Optional
from redis.asyncio import Redis as AsyncRedis, ConnectionPool
from app.core.config import settings
from app.core.log import get_logger

logger = get_logger("redis_client")

_pool: Optional[ConnectionPool] = None
_client: Optional[AsyncRedis] = None
_lock = asyncio.Lock()
_MAX_RETRIES = 3
_BASE_DELAY = 0.5


def _build_url() -> str:
    return settings.REDIS_URL or "redis://localhost:6379/0"


async def get_redis() -> Optional[AsyncRedis]:
    global _pool, _client
    if _client is not None:
        try:
            await _client.ping()
            return _client
        except Exception:
            logger.warning("Redis ping failed, reconnecting...")
            await _disconnect()
    async with _lock:
        if _client is not None:
            return _client
        last_exc = None
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                url = _build_url()
                _pool = ConnectionPool.from_url(
                    url,
                    max_connections=settings.REDIS_MAX_CONNECTIONS,
                    decode_responses=True,
                    socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT,
                    socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
                )
                _client = AsyncRedis(connection_pool=_pool)
                await _client.ping()
                logger.info("Redis connected: %s (attempt %d/%d)", url, attempt, _MAX_RETRIES)
                return _client
            except Exception as exc:
                last_exc = exc
                logger.warning("Redis connect attempt %d/%d failed: %s", attempt, _MAX_RETRIES, exc)
                await _disconnect()
                if attempt < _MAX_RETRIES:
                    delay = _BASE_DELAY * (2 ** (attempt - 1))
                    await asyncio.sleep(delay)
        logger.warning("Redis unavailable after %d retries (%s), running without cache", _MAX_RETRIES, last_exc)
        return None


async def _disconnect():
    global _pool, _client
    if _client is not None:
        try:
            await _client.aclose()
        except Exception:
            pass
        _client = None
    if _pool is not None:
        try:
            await _pool.aclose()
        except Exception:
            pass
        _pool = None


async def close():
    await _disconnect()
    logger.info("Redis connection closed")


def tenant_key(tenant_id: int, prefix: str, *suffix: str) -> str:
    return f"t:{tenant_id}:{prefix}:" + ":".join(suffix)


def global_key(prefix: str, *suffix: str) -> str:
    return f"g:{prefix}:" + ":".join(suffix)


async def cache_get(key: str) -> Optional[str]:
    r = await get_redis()
    if r is None:
        return None
    try:
        return await r.get(key)
    except Exception as exc:
        logger.warning("cache_get error: %s", exc)
        return None


async def cache_set(key: str, value: str, ttl: int = 300) -> bool:
    r = await get_redis()
    if r is None:
        return False
    try:
        await r.setex(key, ttl, value)
        return True
    except Exception as exc:
        logger.warning("cache_set error: %s", exc)
        return False


async def cache_delete(key: str) -> bool:
    r = await get_redis()
    if r is None:
        return False
    try:
        await r.delete(key)
        return True
    except Exception as exc:
        logger.warning("cache_delete error: %s", exc)
        return False


async def cache_delete_pattern(pattern: str) -> int:
    r = await get_redis()
    if r is None:
        return 0
    try:
        cursor = 0
        deleted = 0
        while True:
            cursor, keys = await r.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                deleted += await r.delete(*keys)
            if cursor == 0:
                break
        return deleted
    except Exception as exc:
        logger.warning("cache_delete_pattern error: %s", exc)
        return 0


async def invalidate_tenant(tenant_id: int) -> int:
    return await cache_delete_pattern(f"t:{tenant_id}:*")


async def publish(channel: str, message: str):
    r = await get_redis()
    if r is None:
        return
    try:
        await r.publish(channel, message)
    except Exception as exc:
        logger.warning("redis publish error: %s", exc)


async def subscribe(channel: str) -> Optional[asyncio.Task]:
    r = await get_redis()
    if r is None:
        return None
    try:
        pubsub = r.pubsub()
        await pubsub.subscribe(channel)
        return pubsub
    except Exception as exc:
        logger.warning("redis subscribe error: %s", exc)
        return None
