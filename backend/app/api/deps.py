from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import decode_token
from app.core.rate_limiter import rate_limit as _rate_limit
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
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

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise credentials_exception

    return user


def rate_limit(requests: int, window: int, prefix: str = "default"):
    if not settings.RATE_LIMIT_ENABLED:
        def noop():
            return True
        return noop
    return _rate_limit(requests, window, prefix)
