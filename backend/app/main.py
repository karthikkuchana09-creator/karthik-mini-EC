from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.api import auth, tasks, users, comments, approvals, dashboard, documents, audit_logs, notifications, ai, ws
from app.db.session import engine
from app.db.base import Base
from fastapi.middleware.cors import CORSMiddleware
from app.core.log import setup_logging, get_logger, RequestLogMiddleware

setup_logging()
logger = get_logger("main")

Base.metadata.create_all(bind=engine)
app = FastAPI()


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning("HTTP %d on %s %s", exc.status_code, request.method, request.url.path)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.add_middleware(RequestLogMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(ws.router)

logger.info("Application started")