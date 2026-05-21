import json
import time
import threading
from typing import Optional

from fastapi import HTTPException, Request, status
from starlette.responses import Response

from app.core.config import settings
from app.core.log import get_logger
from app.core.security import decode_token

logger = get_logger("rate_limiter")


class SlidingWindowEntry:
    __slots__ = ("count", "window_start")
    def __init__(self, count: int = 0, window_start: float = 0.0):
        self.count = count
        self.window_start = window_start


class InMemoryBackend:
    def __init__(self):
        self._lock = threading.Lock()
        self._buckets: dict[str, SlidingWindowEntry] = {}

    async def check_and_increment(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        now = time.time()
        with self._lock:
            entry = self._buckets.get(key)
            if entry is None or now - entry.window_start >= window_seconds:
                self._buckets[key] = SlidingWindowEntry(count=1, window_start=now)
                return True, 0

            entry.count += 1
            if entry.count > max_requests:
                retry_after = int(window_seconds - (now - entry.window_start))
                return False, max(retry_after, 1)

            return True, 0

    async def get_remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        now = time.time()
        with self._lock:
            entry = self._buckets.get(key)
            if entry is None or now - entry.window_start >= window_seconds:
                return max_requests
            remaining = max_requests - entry.count
            return max(remaining, 0)


class RedisBackend:
    def __init__(self):
        self._local_ttl = 3600

    def _make_redis_key(self, key: str) -> str:
        return f"ratelimit:{key}"

    async def _get_redis(self):
        from app.core.redis_client import get_redis
        return await get_redis()

    async def check_and_increment(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        try:
            r = await self._get_redis()
            if r is None:
                logger.warning("Redis unavailable, falling back to in-memory rate limit")
                mem._check_and_increment(key, max_requests, window_seconds) if False else None
                return True, 0
            rkey = self._make_redis_key(key)
            pipe = r.pipeline()
            pipe.incr(rkey)
            pipe.expire(rkey, window_seconds)
            results = await pipe.execute()
            count = results[0]
            if count > max_requests:
                ttl = await r.ttl(rkey)
                return False, max(int(ttl), 1)
            return True, 0
        except Exception as exc:
            logger.warning("Redis rate limit error: %s", exc)
            return True, 0

    async def get_remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        try:
            r = await self._get_redis()
            if r is None:
                return max_requests
            rkey = self._make_redis_key(key)
            count = await r.get(rkey)
            if count is None:
                return max_requests
            remaining = max_requests - int(count)
            return max(remaining, 0)
        except Exception as exc:
            logger.warning("Redis rate limit get_remaining error: %s", exc)
            return max_requests


_backend: Optional[InMemoryBackend] = None
_redis_backend: Optional[RedisBackend] = None
_use_redis = False


def _get_backend() -> InMemoryBackend:
    global _backend
    if _backend is None:
        _backend = InMemoryBackend()
    return _backend


def _get_redis_backend() -> RedisBackend:
    global _redis_backend
    if _redis_backend is None:
        _redis_backend = RedisBackend()
    return _redis_backend


def _resolve_client_key(request: Request, prefix: str) -> str:
    scope_state = request.scope.get("state", {})
    user_id = None
    if isinstance(scope_state, dict):
        user_id = scope_state.get("user_id")
    if user_id is None:
        user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"{prefix}:user:{user_id}"
    forwarded = request.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"{prefix}:ip:{ip}"


SKIP_PATHS = {"/docs", "/redoc", "/openapi.json", "/favicon.ico", "/health"}


class RateLimitMiddleware:
    def __init__(self, app, requests: int = 0, window: int = 60):
        self.app = app
        self._max_requests = requests
        self._window = window
        self._use_redis = bool(settings.REDIS_URL)

    async def _check_limit(self, key: str) -> tuple[bool, int]:
        if self._use_redis:
            backend = _get_redis_backend()
            return await backend.check_and_increment(key, self._max_requests, self._window)
        backend = _get_backend()
        return await backend.check_and_increment(key, self._max_requests, self._window)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if "state" not in scope:
            scope["state"] = {}
        request = Request(scope, receive)
        if not settings.RATE_LIMIT_ENABLED:
            await self.app(scope, receive, send)
            return

        if request.method == "GET" and request.url.path in SKIP_PATHS:
            await self.app(scope, receive, send)
            return

        if self._max_requests > 0:
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                payload = decode_token(auth[7:])
                if payload and payload.get("user_id"):
                    scope["state"]["user_id"] = payload["user_id"]

            key = _resolve_client_key(request, "global")
            allowed, retry_after = await self._check_limit(key)
            if not allowed:
                response = Response(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content=f'{{"detail":"Too many requests. Try again in {retry_after} seconds."}}',
                    media_type="application/json",
                    headers={"Retry-After": str(retry_after)},
                )
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)


def rate_limit(requests: int, window: int, prefix: str = "default"):
    use_redis = bool(settings.REDIS_URL)

    async def dependency(request: Request):
        key = _resolve_client_key(request, prefix)
        if use_redis:
            backend = _get_redis_backend()
            allowed, retry_after = await backend.check_and_increment(key, requests, window)
        else:
            backend = _get_backend()
            allowed, retry_after = await backend.check_and_increment(key, requests, window)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )
        return True

    return dependency
