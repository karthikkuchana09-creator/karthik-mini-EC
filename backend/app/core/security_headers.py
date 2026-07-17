from app.core.config import settings


class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def _send(message):
            if message["type"] == "http.response.start":
                headers = message.get("headers", [])
                headers.extend([
                    (b"X-Content-Type-Options", b"nosniff"),
                    (b"X-Frame-Options", b"SAMEORIGIN"),
                    (b"X-XSS-Protection", b"1; mode=block"),
                    (b"Referrer-Policy", b"strict-origin-when-cross-origin"),
                    (b"Permissions-Policy", b"camera=(), microphone=(), geolocation=(), interest-cohort=()"),
                    (b"Cross-Origin-Opener-Policy", b"same-origin"),
                    (b"Cross-Origin-Resource-Policy", b"same-origin"),
                ])
                csp = (
                    "default-src 'self' https://cdn.jsdelivr.net https://cdn.redoc.ly; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.redoc.ly; "
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
                    "font-src 'self' https://fonts.gstatic.com; "
                    "img-src 'self' data: https:; "
                    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com; "
                    "frame-src 'self' https://accounts.google.com; "
                    f"base-uri 'self'; form-action 'self'"
                )
                headers.append((b"Content-Security-Policy", csp.encode()))
                if settings.FRONTEND_URL.startswith("https://"):
                    headers.append((b"Strict-Transport-Security", b"max-age=31536000; includeSubDomains"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, _send)
