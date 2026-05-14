import time
import threading
from typing import Optional

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.config import settings
from app.core.security import decode_token

class SlidingWindowEntry:
    __slots__ = ("count", "window_start")
    def __init__(self, count: int = 0, window_start: float = 0.0):
        self.count = count
        self.window_start = window_start


class InMemoryBackend:
    def __init__(self):
        self._lock = threading.Lock()
        self._buckets: dict[str, SlidingWindowEntry] = {}

    def check_and_increment(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
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

    def get_remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        now = time.time()
        with self._lock:
            entry = self._buckets.get(key)
            if entry is None or now - entry.window_start >= window_seconds:
                return max_requests
            remaining = max_requests - entry.count
            return max(remaining, 0)


_backend: Optional[InMemoryBackend] = None


def _get_backend() -> InMemoryBackend:
    global _backend
    if _backend is None:
        _backend = InMemoryBackend()
    return _backend


def _resolve_client_key(request: Request, prefix: str) -> str:
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"{prefix}:user:{user_id}"
    forwarded = request.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"{prefix}:ip:{ip}"


SKIP_PATHS = {"/docs", "/redoc", "/openapi.json", "/favicon.ico", "/health"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests: int = 0, window: int = 60):
        super().__init__(app)
        self._max_requests = requests
        self._window = window

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        if request.method == "GET" and request.url.path in SKIP_PATHS:
            return await call_next(request)

        if self._max_requests > 0:
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                payload = decode_token(auth[7:])
                if payload and payload.get("user_id"):
                    request.state.user_id = payload["user_id"]

            key = _resolve_client_key(request, "global")
            backend = _get_backend()
            allowed, retry_after = backend.check_and_increment(key, self._max_requests, self._window)
            if not allowed:
                return Response(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content=f'{{"detail":"Too many requests. Try again in {retry_after} seconds."}}',
                    media_type="application/json",
                    headers={"Retry-After": str(retry_after)},
                )

        return await call_next(request)


def rate_limit(requests: int, window: int, prefix: str = "default"):
    backend = _get_backend()

    def dependency(request: Request):
        key = _resolve_client_key(request, prefix)
        allowed, retry_after = backend.check_and_increment(key, requests, window)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )
        return True

    return dependency
