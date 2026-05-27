"""
Central enterprise exception classes and FastAPI handler registration.

Usage in main.py:
    from app.core.exceptions import register_exception_handlers
    register_exception_handlers(app)
"""
from enum import Enum
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.log import get_logger

logger = get_logger("exceptions")


class ErrorCode(str, Enum):
    NOT_FOUND = "NOT_FOUND"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    RATE_LIMITED = "RATE_LIMITED"
    SLA_BREACHED = "SLA_BREACHED"
    ESCALATION_REQUIRED = "ESCALATION_REQUIRED"
    TENANT_MISMATCH = "TENANT_MISMATCH"
    DEPENDENCY_FAILURE = "DEPENDENCY_FAILURE"
    BAD_REQUEST = "BAD_REQUEST"


class AppException(Exception):
    """Base enterprise exception with structured fields."""

    def __init__(
        self,
        status_code: int = 500,
        detail: str = "Internal error",
        error_code: Optional[ErrorCode] = None,
        headers: Optional[dict] = None,
    ):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code or ErrorCode.INTERNAL_ERROR
        self.headers = headers
        super().__init__(self.detail)


class NotFoundException(AppException):
    def __init__(self, entity: str, entity_id: Optional[int] = None):
        detail = f"{entity} not found"
        if entity_id is not None:
            detail += f" id={entity_id}"
        super().__init__(404, detail, ErrorCode.NOT_FOUND)


class ValidationException(AppException):
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(422, detail, ErrorCode.VALIDATION_ERROR)


class AuthException(AppException):
    def __init__(self, detail: str = "Authentication required"):
        super().__init__(401, detail, ErrorCode.UNAUTHORIZED)


class PermissionDeniedException(AppException):
    def __init__(self, permission: Optional[str] = None):
        detail = f"Permission denied: {permission}" if permission else "Permission denied"
        super().__init__(403, detail, ErrorCode.FORBIDDEN)


class ConflictException(AppException):
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(409, detail, ErrorCode.CONFLICT)


class SLABreachException(AppException):
    def __init__(self, detail: str = "SLA deadline exceeded"):
        super().__init__(400, detail, ErrorCode.SLA_BREACHED)


class TenantMismatchException(AppException):
    def __init__(self):
        super().__init__(403, "Tenant access denied", ErrorCode.TENANT_MISMATCH)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all enterprise exception handlers on a FastAPI application."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(
            "AppException %s on %s %s: %s",
            exc.error_code, request.method, request.url.path, exc.detail,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "error_code": exc.error_code.value},
            headers=exc.headers,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.warning("HTTP %d on %s %s", exc.status_code, request.method, request.url.path)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        details = "; ".join(e.get("msg", str(e)) for e in errors)
        logger.warning("Validation error on %s %s: %s", request.method, request.url.path, details)
        return JSONResponse(status_code=422, content={"detail": details})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
