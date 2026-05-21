from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.api import auth, tasks, users, comments, approvals, dashboard, documents, audit_logs, notifications, ai, leaves, organizations, subscription, credits, usage, payments, webhooks, billing, super_admin, monitoring
from app.websocket.routes import router as ws_router
from app.websocket.manager import manager
from app.websocket.pubsub import ws_pubsub
from app.services.ai_notification_service import start_ai_notification_daemon
from app.ai.scheduler import start_ai_scheduler, stop_ai_scheduler
from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from fastapi.middleware.cors import CORSMiddleware
from app.core.log import setup_logging, get_logger, RequestLogMiddleware
from app.core.rate_limiter import RateLimitMiddleware
from app.core.tenant import TenantMiddleware
from app.core.background_tasks import task_queue
from app.core.redis_client import close as close_redis
from app.services.enterprise_scheduler import enterprise_scheduler

setup_logging()
logger = get_logger("main")

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    manager.start_heartbeat()
    start_ai_notification_daemon()
    task_queue.start()
    await ws_pubsub.start_listener()
    await enterprise_scheduler.start()
    if settings.AI_SCHEDULER_ENABLED:
        start_ai_scheduler()
    yield
    logger.info("Shutting down...")
    await enterprise_scheduler.stop()
    stop_ai_scheduler()
    await task_queue.stop(wait=True)
    await ws_pubsub.stop_listener()
    await close_redis()
    logger.info("Shutdown complete")


app = FastAPI(lifespan=lifespan)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning("HTTP %d on %s %s", exc.status_code, request.method, request.url.path)
    headers = getattr(exc, "headers", None)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.add_middleware(RequestLogMiddleware)

app.add_middleware(TenantMiddleware)

app.add_middleware(
    RateLimitMiddleware,
    requests=200,
    window=60,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(users.router)
app.include_router(comments.router)
app.include_router(approvals.router)
app.include_router(dashboard.router)
app.include_router(documents.router)
app.include_router(audit_logs.router)
app.include_router(notifications.router)
app.include_router(ai.router)
app.include_router(ws_router)
app.include_router(leaves.router)
app.include_router(organizations.router)
app.include_router(subscription.router)
app.include_router(credits.router)
app.include_router(usage.router)
app.include_router(payments.router)
app.include_router(webhooks.router)
app.include_router(billing.router)
app.include_router(super_admin.router)
app.include_router(monitoring.router)

logger.info("Application started")