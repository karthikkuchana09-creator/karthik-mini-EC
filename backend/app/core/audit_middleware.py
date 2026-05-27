"""
Enterprise audit ASGI middleware.

Initializes the trace context (correlation_id, trace_id, IP, user_agent)
for every incoming request and attaches enterprise traceability headers
to the response.
"""
import time
from uuid import uuid4

from app.core.audit_context import AuditContext, set_audit_context, reset_audit_context
from app.core.log import get_logger

logger = get_logger("audit_middleware")

CORRELATION_HEADER = "X-Correlation-ID"
TRACE_HEADER = "X-Trace-ID"


class EnterpriseAuditMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.time()

        correlation_id = None
        trace_id = str(uuid4())

        headers = dict(scope.get("headers", []))

        raw_cid = headers.get(b"x-correlation-id")
        if raw_cid:
            correlation_id = raw_cid.decode("utf-8")

        correlation_id = correlation_id or str(uuid4())

        client = scope.get("client")
        ip_address = client[0] if client else None

        raw_ua = headers.get(b"user-agent")
        user_agent = raw_ua.decode("utf-8", errors="replace") if raw_ua else None

        ctx = AuditContext(
            correlation_id=correlation_id,
            trace_id=trace_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_path=scope.get("path"),
        )
        set_audit_context(ctx)

        async def _send(message):
            if message["type"] == "http.response.start":
                headers_list = message.get("headers", [])
                headers_list.append(
                    (CORRELATION_HEADER.encode(), ctx.correlation_id.encode())
                )
                headers_list.append(
                    (TRACE_HEADER.encode(), ctx.trace_id.encode())
                )
                message["headers"] = headers_list

                elapsed = time.time() - start
                status = message.get("status", 0)
                logger.info(
                    "[%s] %s %s -> %d (%.3fs)",
                    ctx.correlation_id[:12],
                    scope.get("method", "?"),
                    scope.get("path", "?"),
                    status,
                    elapsed,
                )
            await send(message)

        try:
            await self.app(scope, receive, _send)
        except Exception as exc:
            elapsed = time.time() - start
            logger.error(
                "[%s] %s %s -> ERROR %s (%.3fs)",
                ctx.correlation_id[:12],
                scope.get("method", "?"),
                scope.get("path", "?"),
                exc,
                elapsed,
            )
            raise
        finally:
            reset_audit_context()
