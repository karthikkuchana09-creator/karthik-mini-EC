from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import decode_token
from app.core.rate_limiter import rate_limit as _rate_limit
from app.core.config import settings
from app.core.tenant import (
    get_current_tenant_id,
    require_tenant,
    require_active_tenant,
    tenant_filter,
    TenantInfo,
    get_current_tenant_info,
    get_current_tenant,
    require_current_tenant,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
        tenant_id = require_active_tenant(request)
        request.state.tenant_id = tenant_id
        yield db
    finally:
        db.close()


def get_current_tenant_dep(
    request: Request,
    db: Session = Depends(get_db),
):
    from app.models.tenant import Tenant
    return get_current_tenant(request, db)


def get_require_current_tenant_dep(
    request: Request,
    db: Session = Depends(get_db),
):
    return require_current_tenant(request, db)


def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("user_id")
    if user_id is None:
        raise credentials_exception

    request.state.user_id = user_id

    stmt = select(User).where(User.id == user_id)
    user = db.scalar(stmt)

    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    jwt_tenant_id = payload.get("tenant_id")
    request_tenant_id = get_current_tenant_id(request)

    if jwt_tenant_id is not None and request_tenant_id is not None:
        if jwt_tenant_id != request_tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant mismatch: token belongs to a different organization",
            )

    if jwt_tenant_id is not None and jwt_tenant_id != user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token tenant does not match user tenant",
        )

    if request_tenant_id is not None and user.tenant_id is not None:
        if request_tenant_id != user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not belong to this organization",
            )

    request.state.user = user
    if user.tenant_id:
        request.state.tenant_id = user.tenant_id

    return user


def get_current_tenant_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_tenant_db),
):
    return get_current_user(request, token, db)


def get_current_active_tenant_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_active_tenant_db),
):
    return get_current_user(request, token, db)


def require_tenant_access(
    request: Request,
    user: User = Depends(get_current_user),
) -> int:
    tenant_id = require_tenant(request)
    if user.tenant_id and user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to this organization",
        )
    return tenant_id


class TenantPathDependency:
    def __init__(self, model, allow_cross_tenant: bool = False):
        self.model = model
        self.allow_cross_tenant = allow_cross_tenant

    async def __call__(self, request: Request, db: Session = Depends(get_db)):
        tenant_id = get_current_tenant_id(request)
        if tenant_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant required")
        stmt = select(self.model)
        if not self.allow_cross_tenant:
            stmt = tenant_filter(stmt, self.model, tenant_id)
        return db.execute(stmt).scalars().all()


def rate_limit(requests: int, window: int, prefix: str = "default"):
    if not settings.RATE_LIMIT_ENABLED:
        def noop():
            return True
        return noop
    return _rate_limit(requests, window, prefix)
