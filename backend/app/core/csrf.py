import secrets
import hmac
import hashlib
from typing import Optional
from fastapi import HTTPException, Request
from fastapi.responses import Response
from app.core.config import settings

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_TOKEN_BYTES = 32


def generate_csrf_token() -> str:
    return secrets.token_hex(CSRF_TOKEN_BYTES)


def validate_csrf_token(request: Request) -> None:
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get(CSRF_HEADER_NAME)

    if not cookie_token or not header_token:
        raise HTTPException(status_code=403, detail="CSRF token missing")

    if not hmac.compare_digest(cookie_token, header_token):
        raise HTTPException(status_code=403, detail="CSRF token mismatch")


class CSRFMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        from starlette.datastructures import Headers
        from starlette.requests import Request

        request = Request(scope, receive)

        path = request.url.path
        if path in (
            "/docs", "/redoc", "/openapi.json", "/favicon.ico", "/health",
            "/auth/login", "/auth/register", "/auth/org/login", "/auth/org/register",
            "/auth/refresh", "/auth/forgot-password", "/auth/reset-password",
            "/auth/google", "/auth/google/callback",
        ):
            await self.app(scope, receive, send)
            return

        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            await self.app(scope, receive, send)
            return

        if request.method not in ("GET", "HEAD", "OPTIONS"):
            try:
                validate_csrf_token(request)
            except HTTPException:
                response = Response(
                    status_code=403,
                    content='{"detail":"CSRF validation failed"}',
                    media_type="application/json",
                )
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)
