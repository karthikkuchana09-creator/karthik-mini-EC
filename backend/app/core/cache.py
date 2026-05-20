import asyncio
import functools
import hashlib
import json
import time
import threading
from typing import Any, Callable, Optional

from app.core.config import settings
from app.core.log import get_logger

logger = get_logger("cache")


class CacheBackend:
    async def get(self, key: str) -> Optional[Any]:
        raise NotImplementedError

    async def set(self, key: str, value: Any, ttl: int) -> None:
        raise NotImplementedError

    async def delete(self, key: str) -> None:
        raise NotImplementedError

    async def delete_pattern(self, pattern: str) -> None:
        raise NotImplementedError


class _MemoryEntry:
    __slots__ = ("value", "expires_at")
    def __init__(self, value: Any, expires_at: float):
        self.value = value
        self.expires_at = expires_at


class InMemoryBackend(CacheBackend):
    def __init__(self):
        self._store: dict[str, _MemoryEntry] = {}
        self._lock = threading.Lock()

    async def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if now >= entry.expires_at:
                del self._store[key]
                return None
            return entry.value

    async def set(self, key: str, value: Any, ttl: int) -> None:
        expires_at = time.time() + ttl
        with self._lock:
            self._store[key] = _MemoryEntry(value, expires_at)

    async def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    async def delete_pattern(self, pattern: str) -> None:
        prefix = pattern.replace("*", "")
        with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]


class RedisBackend(CacheBackend):
    def __init__(self):
        self._redis = None

    async def _get_redis(self):
        if self._redis is None:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis

    async def get(self, key: str) -> Optional[Any]:
        try:
            r = await self._get_redis()
            val = await r.get(key)
            if val is None:
                return None
            return json.loads(val)
        except Exception as e:
            logger.warning("Redis get failed: %s", e)
            return None

    async def set(self, key: str, value: Any, ttl: int) -> None:
        try:
            r = await self._get_redis()
            await r.setex(key, ttl, json.dumps(value, default=str))
        except Exception as e:
            logger.warning("Redis set failed: %s", e)

    async def delete(self, key: str) -> None:
        try:
            r = await self._get_redis()
            await r.delete(key)
        except Exception as e:
            logger.warning("Redis delete failed: %s", e)

    async def delete_pattern(self, pattern: str) -> None:
        try:
            r = await self._get_redis()
            keys = await r.keys(pattern)
            if keys:
                await r.delete(*keys)
        except Exception as e:
            logger.warning("Redis delete_pattern failed: %s", e)


_backend: Optional[CacheBackend] = None


def _get_backend() -> CacheBackend:
    global _backend
    if _backend is not None:
        return _backend

    if settings.REDIS_URL:
        try:
            _backend = RedisBackend()
            logger.info("Cache backend: Redis (%s)", settings.REDIS_URL)
            return _backend
        except Exception as e:
            logger.warning("Failed to init Redis cache: %s", e)

    _backend = InMemoryBackend()
    logger.info("Cache backend: InMemory")
    return _backend


def _normalize_arg(a: Any) -> str:
    if hasattr(a, "id"):
        return str(a.id)
    return str(a)


def _make_key(prefix: str, args, kwargs, exclude_args: Optional[list[int]] = None, exclude_kwargs: Optional[list[str]] = None) -> str:
    parts = [prefix]
    exclude_args_set = set(exclude_args or [])
    for i, a in enumerate(args):
        if i not in exclude_args_set:
            parts.append(_normalize_arg(a))
    if kwargs:
        filtered_kw = {k: v for k, v in sorted(kwargs.items()) if not (exclude_kwargs and k in exclude_kwargs)}
        if filtered_kw:
            parts.append(hashlib.md5(json.dumps(filtered_kw, default=str).encode()).hexdigest()[:8])
    return ":".join(parts)


async def cache_get(key: str) -> Optional[Any]:
    return await _get_backend().get(key)


async def cache_set(key: str, value: Any, ttl: int) -> None:
    await _get_backend().set(key, value, ttl)


async def cache_delete(key: str) -> None:
    await _get_backend().delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    await _get_backend().delete_pattern(pattern)


def cached(prefix: str, ttl: int = 300, exclude_args: Optional[list[int]] = None, exclude_kwargs: Optional[list[str]] = None):
    def decorator(func: Callable):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            key = _make_key(prefix, args, kwargs, exclude_args, exclude_kwargs)
            cached_val = await cache_get(key)
            if cached_val is not None:
                return cached_val
            result = await func(*args, **kwargs)
            effective_ttl = ttl() if callable(ttl) else ttl
            await cache_set(key, result, effective_ttl)
            return result

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            key = _make_key(prefix, args, kwargs, exclude_args, exclude_kwargs)
            loop = _get_or_create_loop()
            if loop.is_running():
                return func(*args, **kwargs)
            cached_val = loop.run_until_complete(cache_get(key))
            if cached_val is not None:
                return cached_val
            result = func(*args, **kwargs)
            effective_ttl = ttl() if callable(ttl) else ttl
            loop.run_until_complete(cache_set(key, result, effective_ttl))
            return result

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


def invalidate(patterns: list[str]):
    def decorator(func: Callable):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            for pattern in patterns:
                await cache_delete_pattern(pattern)
            return result

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            loop = _get_or_create_loop()
            if not loop.is_running():
                for pattern in patterns:
                    loop.run_until_complete(cache_delete_pattern(pattern))
            return result

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


def _get_or_create_loop():
    try:
        return asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop
