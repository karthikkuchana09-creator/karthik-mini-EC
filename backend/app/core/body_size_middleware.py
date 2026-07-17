from starlette.responses import Response
from starlette.status import HTTP_413_CONTENT_TOO_LARGE
from app.core.config import settings

SKIP_PATHS = {"/docs", "/redoc", "/openapi.json", "/favicon.ico"}


class RequestBodySizeMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        max_body = settings.MAX_REQUEST_BODY_SIZE
        max_json = settings.MAX_JSON_BODY_SIZE

        original_receive = receive
        received = [False]
        body_size = [0]
        content_type = [""]

        async def _receive():
            if not received[0]:
                for h in scope.get("headers", []):
                    if h[0] == b"content-type":
                        content_type[0] = h[1].decode("utf-8", errors="replace")
                        break
                received[0] = True

            msg = await original_receive()
            if msg["type"] == "http.request":
                chunk = msg.get("body", b"")
                body_size[0] += len(chunk)
                limit = max_json if "json" in content_type[0] else max_body
                if body_size[0] > limit:
                    response = Response(
                        status_code=HTTP_413_CONTENT_TOO_LARGE,
                        content='{"detail":"Request body too large"}',
                        media_type="application/json",
                    )
                    await response(scope, receive, send)
                    return None
            return msg

        await self.app(scope, _receive, send)
