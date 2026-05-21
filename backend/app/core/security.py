import hashlib
import secrets
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str):
    return pwd_context.verify(password, hashed)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access_token"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_tenant_access_token(
    user_id: int,
    role: str,
    tenant_id: int | None = None,
    tenant_slug: str | None = None,
    subscription_role: str | None = None,
    extra_claims: dict | None = None,
) -> str:
    claims = {
        "user_id": user_id,
        "role": role,
        "type": "access_token",
    }
    if tenant_id is not None:
        claims["tenant_id"] = tenant_id
    if tenant_slug is not None:
        claims["tenant_slug"] = tenant_slug
    if subscription_role is not None:
        claims["subscription_role"] = subscription_role
    if extra_claims:
        claims.update(extra_claims)
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    claims["exp"] = expire
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token():
    raw_token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    return raw_token, token_hash


def create_reset_token():
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    return raw_token, token_hash


def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def hash_token_raw(token: str):
    return hashlib.sha256(token.encode()).hexdigest()