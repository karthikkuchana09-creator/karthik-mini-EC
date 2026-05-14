import unicodedata
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.log import get_logger

logger = get_logger("input_middleware")

SKIP_PATHS = {"/docs", "/redoc", "/openapi.json", "/favicon.ico"}


class InputCleaningMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "GET" or request.url.path in SKIP_PATHS:
            return await call_next(request)

        body = await request.body()
        if not body:
            return await call_next(request)

        try:
            cleaned = self._clean_body(body)
            if cleaned != body:
                request._body = cleaned
        except Exception:
            pass

        return await call_next(request)

    @staticmethod
    def _clean_body(body: bytes) -> bytes:
        try:
            text = body.decode("utf-8")
        except UnicodeDecodeError:
            return body

        cleaned = unicodedata.normalize("NFKC", text)
        cleaned = "".join(c for c in cleaned if not unicodedata.category(c).startswith("C") or c in "\n\r\t")
        return cleaned.encode("utf-8")
