import time
from enum import Enum
from functools import lru_cache
from typing import Optional
from fastapi import Request, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from starlette.datastructures import MutableHeaders
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.organization import Organization
from app.core.security import decode_token
from app.core.config import settings
from app.core.log import get_logger
from app.models.tenant import Tenant

logger = get_logger("tenant")

TENANT_HEADER = "X-Tenant-ID"
TENANT_SLUG_HEADER = "X-Tenant-Slug"


class TenantResolutionMethod(str, Enum):
    REQUEST_STATE = "request_state"
    JWT_TOKEN = "jwt_token"
    HEADER_ID = "header_id"
    HEADER_SLUG = "header_slug"
    SUBDOMAIN = "subdomain"
    AUTHENTICATED_USER = "authenticated_user"


PUBLIC_PATHS = (
    "/docs", "/openapi.json", "/redoc",
    "/auth/register", "/auth/org/register",
    "/auth/login", "/auth/org/login",
    "/auth/refresh",
    "/auth/forgot-password", "/auth/reset-password",
    "/auth/google",
)


class TenantInfo:
    def __init__(self, id: int, slug: str, name: str, is_active: bool, tenant_table_id: int | None = None):
        self.id = id
        self.slug = slug
        self.name = name
        self.is_active = is_active
        self.tenant_table_id: int | None = tenant_table_id
        self.resolved_at: float = time.time()
        self.method: Optional[TenantResolutionMethod] = None

    def __repr__(self) -> str:
        return f"TenantInfo(id={self.id}, slug='{self.slug}', active={self.is_active}, tenant_table_id={self.tenant_table_id})"


class TenantResolver:
    _cache: dict[str, TenantInfo] = {}
    _cache_ttl: float = 300.0

    @classmethod
    def invalidate_cache(cls, key: str | int) -> None:
        str_key = str(key)
        cls._cache.pop(str_key, None)
        cls._cache.pop(f"id:{str_key}", None)
        cls._cache.pop(f"slug:{str_key}", None)

    @classmethod
    def clear_cache(cls) -> None:
        cls._cache.clear()
        logger.debug("Tenant cache cleared")

    @classmethod
    def _get_cached(cls, key: str) -> Optional[TenantInfo]:
        entry = cls._cache.get(key)
        if entry and (time.time() - entry.resolved_at) < cls._cache_ttl:
            return entry
        if entry:
            cls._cache.pop(key, None)
        return None

    @classmethod
    def _set_cache(cls, key: str, info: TenantInfo) -> None:
        cls._cache[key] = info

    @classmethod
    def resolve_from_db(cls, db: Session, org_id: int = None, slug: str = None) -> Optional[TenantInfo]:
        lookup_key = f"id:{org_id}" if org_id is not None else f"slug:{slug}"
        cached = cls._get_cached(lookup_key)
        if cached:
            return cached

        if org_id is not None:
            org = db.execute(select(Organization).where(Organization.id == org_id)).scalar_one_or_none()
        elif slug is not None:
            org = db.execute(select(Organization).where(Organization.slug == slug)).scalar_one_or_none()
        else:
            return None

        if not org:
            return None

        tenant_table_id = cls._resolve_tenant_table_id(db, org)
        info = TenantInfo(id=org.id, slug=org.slug, name=org.name, is_active=org.is_active, tenant_table_id=tenant_table_id)
        cls._set_cache(f"id:{org.id}", info)
        cls._set_cache(f"slug:{org.slug}", info)
        return info

    @classmethod
    def _resolve_tenant_table_id(cls, db: Session, org: Organization) -> int | None:
        tenant = db.execute(select(Tenant).where(Tenant.slug == org.slug)).scalar_one_or_none()
        if tenant:
            return tenant.id
        return org.id

    @classmethod
    def from_header_id(cls, request: Request, db: Session) -> Optional[TenantInfo]:
        raw = request.headers.get(TENANT_HEADER)
        if not raw:
            return None
        try:
            org_id = int(raw)
            info = cls.resolve_from_db(db, org_id=org_id)
            if info:
                info.method = TenantResolutionMethod.HEADER_ID
                logger.debug("Tenant resolved via X-Tenant-ID header: %s", info)
            return info
        except (ValueError, TypeError):
            logger.warning("Invalid X-Tenant-ID header value: %s", raw)
            return None

    @classmethod
    def from_header_slug(cls, request: Request, db: Session) -> Optional[TenantInfo]:
        slug = request.headers.get(TENANT_SLUG_HEADER)
        if not slug:
            return None
        info = cls.resolve_from_db(db, slug=slug)
        if info:
            info.method = TenantResolutionMethod.HEADER_SLUG
            logger.debug("Tenant resolved via X-Tenant-Slug header: %s", info)
        else:
            logger.warning("X-Tenant-Slug '%s' did not match any organization", slug)
        return info

    @classmethod
    def from_subdomain(cls, request: Request, db: Session) -> Optional[TenantInfo]:
        host = request.headers.get("host", "")
        if not host or "." not in host:
            return None
        parts = host.split(".")
        subdomain = parts[0]
        ignored = {"www", "app", "api", "localhost", "127", "192", "::1"}
        if not subdomain or subdomain in ignored:
            return None
        port = ""
        if ":" in subdomain:
            subdomain = subdomain.split(":")[0]
        info = cls.resolve_from_db(db, slug=subdomain)
        if info:
            info.method = TenantResolutionMethod.SUBDOMAIN
            logger.debug("Tenant resolved via subdomain '%s': %s", subdomain, info)
        return info

    @classmethod
    def from_jwt(cls, request: Request) -> Optional[int]:
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        token = auth[7:]
        payload = decode_token(token)
        if payload is None:
            return None
        tenant_id = payload.get("tenant_id")
        if tenant_id is not None:
            logger.debug("Tenant ID %s resolved from JWT claim", tenant_id)
        return tenant_id

    @classmethod
    def from_jwt_with_db(cls, request: Request, db: Session) -> Optional[TenantInfo]:
        tenant_id = cls.from_jwt(request)
        if tenant_id is None:
            return None
        info = cls.resolve_from_db(db, org_id=tenant_id)
        if info:
            info.method = TenantResolutionMethod.JWT_TOKEN
        return info

    @classmethod
    def from_request_state(cls, request: Request) -> Optional[int]:
        return getattr(request.state, "tenant_id", None)

    @classmethod
    def from_authenticated_user(cls, request: Request, db: Session) -> Optional[TenantInfo]:
        user = getattr(request.state, "user", None)
        if user and hasattr(user, "tenant_id") and user.tenant_id:
            info = cls.resolve_from_db(db, org_id=user.tenant_id)
            if info:
                info.method = TenantResolutionMethod.AUTHENTICATED_USER
                return info
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            from app.models.user import User
            user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
            if user and user.tenant_id:
                request.state.user = user
                info = cls.resolve_from_db(db, org_id=user.tenant_id)
                if info:
                    info.method = TenantResolutionMethod.AUTHENTICATED_USER
                    return info
        return None

    @classmethod
    def resolve(cls, request: Request, db: Session = None) -> Optional[TenantInfo]:
        cached_id = cls.from_request_state(request)
        if cached_id:
            info = cls.resolve_from_db(db or SessionLocal(), org_id=cached_id)
            if info:
                info.method = TenantResolutionMethod.REQUEST_STATE
                return info

        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            resolvers = [
                cls.from_header_id,
                cls.from_header_slug,
                cls.from_subdomain,
                cls.from_jwt_with_db,
                cls.from_authenticated_user,
            ]
            for resolver in resolvers:
                info = resolver(request, db)
                if info is not None:
                    return info
            return None
        finally:
            if close_db:
                db.close()


class TenantMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        path = request.url.path

        if path.startswith(PUBLIC_PATHS):
            await self.app(scope, receive, send)
            return

        db = SessionLocal()
        try:
            info = TenantResolver.resolve(request, db)

            if info is None:
                if path.startswith("/ws"):
                    await self.app(scope, receive, send)
                    return
                logger.warning("No tenant resolved for %s %s", request.method, path)
                await self.app(scope, receive, send)
                return

            if "state" not in scope:
                scope["state"] = {}
            scope["state"]["tenant_id"] = info.id
            scope["state"]["tenant_table_id"] = info.tenant_table_id if info.tenant_table_id is not None else info.id
            scope["state"]["tenant_slug"] = info.slug
            scope["state"]["tenant_info"] = info

            if not info.is_active:
                logger.warning("Blocked request to inactive tenant '%s' (%d)", info.slug, info.id)
                response = JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Organization is inactive. Contact support.", "code": "TENANT_INACTIVE"},
                )
                await response(scope, receive, send)
                return

            _elapsed_ms: list[int] = [0]
            _start = time.time()

            async def tenant_send(message):
                if message["type"] == "http.response.start":
                    _elapsed_ms[0] = int((time.time() - _start) * 1000)
                    headers = MutableHeaders(scope=message)
                    headers["X-Tenant-ID"] = str(info.id)
                    headers["X-Tenant-Slug"] = info.slug
                    headers["X-Tenant-Query-Time"] = str(_elapsed_ms[0])
                await send(message)

            await self.app(scope, receive, tenant_send)

            try:
                from app.services.tenant_monitor import TenantMonitor
                TenantMonitor.record_query_time_sync(db, info.id, _elapsed_ms[0])
            except Exception:
                pass
        finally:
            db.close()


def get_current_tenant_id(request: Request) -> Optional[int]:
    return getattr(request.state, "tenant_id", None)


def get_current_tenant_table_id(request: Request) -> Optional[int]:
    return getattr(request.state, "tenant_table_id", None)


def get_current_tenant_info(request: Request) -> Optional[TenantInfo]:
    return getattr(request.state, "tenant_info", None)


def get_current_tenant(request: Request, db: Session) -> Optional[Tenant]:
    tenant_id = get_current_tenant_id(request)
    if tenant_id is None:
        return None
    return db.execute(select(Tenant).where(Tenant.id == tenant_id)).scalar_one_or_none()


def require_current_tenant(request: Request, db: Session) -> Tenant:
    tenant_id = require_active_tenant(request)
    tenant = db.execute(select(Tenant).where(Tenant.id == tenant_id)).scalar_one_or_none()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    return tenant


def require_tenant(request: Request) -> int:
    tenant_id = get_current_tenant_id(request)
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant identification required. Provide X-Tenant-ID or X-Tenant-Slug header.",
            headers={"X-Tenant-Required": "true"},
        )
    return tenant_id


def require_active_tenant(request: Request) -> int:
    info = get_current_tenant_info(request)
    if info is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant identification required.",
        )
    if not info.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization is inactive. Contact support.",
        )
    return info.id


def tenant_filter(stmt, model, tenant_id: int):
    if hasattr(model, "tenant_id"):
        return stmt.where(model.tenant_id == tenant_id)
    return stmt


def multi_tenant_filter(stmt, model, tenant_ids: list[int]):
    if hasattr(model, "tenant_id") and tenant_ids:
        return stmt.where(model.tenant_id.in_(tenant_ids))
    return stmt


def get_tenant_db(request: Request):
    db = SessionLocal()
    try:
        tenant_id = get_current_tenant_id(request)
        if tenant_id:
            request.state.tenant_id = tenant_id
        yield db
    finally:
        db.close()


def get_active_tenant_db(request: Request):
    db = SessionLocal()
    try:
        tenant_id = get_current_tenant_id(request)
        if tenant_id:
            info = TenantResolver.resolve_from_db(db, org_id=tenant_id)
            if info and not info.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization is inactive. Contact support.",
                )
            request.state.tenant_id = tenant_id
            request.state.tenant_info = info
        yield db
    finally:
        db.close()


class TenantAwareQuery:
    def __init__(self, model, db: Session, tenant_id: int):
        self.model = model
        self.db = db
        self.tenant_id = tenant_id

    def _stmt(self):
        stmt = select(self.model)
        return tenant_filter(stmt, self.model, self.tenant_id)

    def get(self, ident):
        return self.db.execute(self._stmt().where(self.model.id == ident)).scalar_one_or_none()

    def first(self):
        return self.db.execute(self._stmt().limit(1)).scalar_one_or_none()

    def all(self):
        return self.db.execute(self._stmt().order_by(self.model.id)).scalars().all()

    def count(self):
        return self.db.scalar(select(func.count()).select_from(self._stmt().subquery()))

    def paginate(self, skip: int = 0, limit: int = 100):
        return self.db.execute(self._stmt().offset(skip).limit(limit)).scalars().all()

    def filter(self, *criterion):
        stmt = self._stmt()
        for c in criterion:
            stmt = stmt.where(c)
        return self.db.execute(stmt).scalars().all()



