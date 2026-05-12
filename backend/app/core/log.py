import logging
import sys
import time
from pathlib import Path

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    root_logger = logging.getLogger("karthik_ec")
    root_logger.setLevel(level)

    if root_logger.handlers:
        return root_logger

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))
    root_logger.addHandler(handler)

    log_dir = Path(__file__).resolve().parent.parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    file_handler = logging.FileHandler(log_dir / "app.log", encoding="utf-8")
    file_handler.setLevel(level)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))
    root_logger.addHandler(file_handler)

    return root_logger


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"karthik_ec.{name}")


class RequestLogMiddleware:
    def __init__(self, app):
        self.app = app
        self.logger = get_logger("http")

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.time()
        method = scope.get("method", "?")
        path = scope.get("path", "?")

        async def _send(message):
            if message["type"] == "http.response.start":
                status = message.get("status", 0)
                elapsed = time.time() - start
                self.logger.info("%s %s -> %d (%.3fs)", method, path, status, elapsed)
            await send(message)

        try:
            await self.app(scope, receive, _send)
        except Exception as exc:
            elapsed = time.time() - start
            self.logger.error("%s %s -> ERROR %s (%.3fs)", method, path, exc, elapsed)
            raise
