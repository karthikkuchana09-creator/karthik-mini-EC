import uuid
import httpx
from typing import Optional
from urllib.parse import urlencode
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.refresh_token import RefreshToken
from app.models.password_reset_token import PasswordResetToken
from app.schemas.user import UserCreate
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, create_reset_token, hash_token_raw
from app.core.config import settings
from app.core.log import get_logger
from app.services.email_service import send_reset_password_email
from app.services.audit_log_service import log_action

logger = get_logger("auth_service")


def register_user(db: Session, user_data: UserCreate):
    logger.info("Attempting registration: email=%s role=%s", user_data.email, user_data.role)

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        logger.warning("Registration failed: email already registered email=%s", user_data.email)
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("User registered successfully id=%d email=%s role=%s", new_user.id, new_user.email, new_user.role)
    return {
        "id": new_user.id,
        "email": new_user.email,
        "role": new_user.role
    }


def _build_user_dict(user: User):
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "avatar_url": user.avatar_url,
        "auth_provider": user.auth_provider,
    }


def _issue_refresh_token(db: Session, user_id: int) -> str:
    raw_token, token_hash = create_refresh_token()
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    rt = RefreshToken(
        token_hash=token_hash,
        user_id=user_id,
        expires_at=expires_at,
    )
    db.add(rt)
    db.commit()

    logger.debug("Issued refresh token for user_id=%d", user_id)
    return raw_token


def login_user(db: Session, email: str, password: str):
    logger.info("Login attempt: email=%s", email)

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.hashed_password):
        logger.warning("Login failed: invalid credentials email=%s", email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({
        "user_id": user.id,
        "role": user.role.value if hasattr(user.role, "value") else user.role
    })

    refresh_token = _issue_refresh_token(db, user.id)

    logger.info("Login success: user_id=%d email=%s role=%s", user.id, user.email, user.role)
    log_action(db, user.id, "login", "auth", user.id, new_value={"email": user.email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _build_user_dict(user)
    }


def refresh_access_token(db: Session, raw_refresh_token: str):
    token_hash = hash_token_raw(raw_refresh_token)

    stored_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash
    ).first()

    if not stored_token:
        logger.warning("Refresh token not found in DB")
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if stored_token.is_revoked:
        _revoke_token_family(db, stored_token)
        logger.warning("Reuse detected — revoking token family for user_id=%d", stored_token.user_id)
        raise HTTPException(status_code=401, detail="Refresh token has been revoked")

    if stored_token.expires_at < datetime.utcnow():
        logger.warning("Expired refresh token used for user_id=%d", stored_token.user_id)
        raise HTTPException(status_code=401, detail="Refresh token has expired")

    user = db.query(User).filter(User.id == stored_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    stored_token.is_revoked = True
    stored_token.revoked_at = datetime.utcnow()

    new_raw_token = _issue_refresh_token(db, user.id)
    stored_token.replaced_by_token_hash = hash_token_raw(new_raw_token)
    db.commit()

    access_token = create_access_token({
        "user_id": user.id,
        "role": user.role.value if hasattr(user.role, "value") else user.role
    })

    logger.info("Token rotated for user_id=%d", user.id)
    return {
        "access_token": access_token,
        "refresh_token": new_raw_token,
        "token_type": "bearer"
    }


def _revoke_token_family(db: Session, token: RefreshToken):
    token.is_revoked = True
    token.revoked_at = datetime.utcnow()

    child = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token.replaced_by_token_hash
    ).first()
    if child and not child.is_revoked:
        _revoke_token_family(db, child)


def logout_user(db: Session, raw_refresh_token: str):
    token_hash = hash_token_raw(raw_refresh_token)

    stored_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash
    ).first()

    if not stored_token:
        logger.warning("Logout with unknown refresh token")
        raise HTTPException(status_code=404, detail="Refresh token not found")

    stored_token.is_revoked = True
    stored_token.revoked_at = datetime.utcnow()
    db.commit()

    logger.info("User logged out — refresh token revoked for user_id=%d", stored_token.user_id)
    return {"message": "Successfully logged out"}


def forgot_password(db: Session, email: str):
    logger.info("Password reset requested for email=%s", email)

    user = db.query(User).filter(User.email == email).first()

    if not user:
        logger.info("Password reset requested for unknown email=%s", email)
        return {"message": "If the email exists, a reset link has been sent"}

    raw_token, token_hash = create_reset_token()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)

    reset_token = PasswordResetToken(
        token_hash=token_hash,
        user_id=user.id,
        expires_at=expires_at,
    )
    db.add(reset_token)
    db.commit()

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"

    send_reset_password_email(user.email, reset_url)

    logger.info("Reset token issued for user_id=%d", user.id)
    return {"message": "If the email exists, a reset link has been sent"}


def reset_password(db: Session, raw_token: str, new_password: str):
    logger.info("Password reset attempt")

    token_hash = hash_token_raw(raw_token)

    stored_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash
    ).first()

    if not stored_token:
        logger.warning("Invalid reset token used")
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if stored_token.is_used:
        logger.warning("Reset token already used for user_id=%d", stored_token.user_id)
        raise HTTPException(status_code=400, detail="Reset token has already been used")

    if stored_token.expires_at < datetime.utcnow():
        logger.warning("Expired reset token used for user_id=%d", stored_token.user_id)
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user = db.query(User).filter(User.id == stored_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.hashed_password = hash_password(new_password)
    stored_token.is_used = True
    stored_token.used_at = datetime.utcnow()
    db.commit()

    logger.info("Password reset successfully for user_id=%d", user.id)
    return {"message": "Password has been reset successfully"}


def _generate_oauth_state() -> str:
    return str(uuid.uuid4())


def get_google_login_url():
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "state": _generate_oauth_state(),
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    logger.info("Generated Google OAuth URL")
    return {"auth_url": auth_url}


def google_oauth_callback(db: Session, code: str, state: Optional[str] = None):
    logger.info("Google OAuth callback received")

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    try:
        resp = httpx.post(token_url, data=data, timeout=10)
        resp.raise_for_status()
        token_data = resp.json()
    except Exception as e:
        logger.error("Failed to exchange Google auth code: %s", e)
        raise HTTPException(status_code=400, detail="Failed to authenticate with Google")

    id_token = token_data.get("id_token")
    access_token_google = token_data.get("access_token")

    userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token_google}"}

    try:
        userinfo_resp = httpx.get(userinfo_url, headers=headers, timeout=10)
        userinfo_resp.raise_for_status()
        google_user = userinfo_resp.json()
    except Exception as e:
        logger.error("Failed to fetch Google user info: %s", e)
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")

    google_id = str(google_user.get("id"))
    email = google_user.get("email", "")
    name = google_user.get("name", email.split("@")[0] if email else "Google User")
    avatar = google_user.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    user = db.query(User).filter(
        (User.google_id == google_id) | (User.email == email)
    ).first()

    if user:
        user.google_id = user.google_id or google_id
        user.avatar_url = user.avatar_url or avatar
        user.auth_provider = "google"
        if not user.name or user.name == "Google User":
            user.name = name
        db.commit()
        db.refresh(user)
        logger.info("Existing user logged in via Google: user_id=%d", user.id)
    else:
        user = User(
            name=name,
            email=email,
            google_id=google_id,
            avatar_url=avatar,
            auth_provider="google",
            hashed_password=hash_password(uuid.uuid4().hex),
            role=UserRole.employee,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("New user created via Google: user_id=%d email=%s", user.id, email)

    access_token = create_access_token({
        "user_id": user.id,
        "role": user.role.value if hasattr(user.role, "value") else user.role
    })

    refresh_token = _issue_refresh_token(db, user.id)

    log_action(db, user.id, "login", "auth", user.id, new_value={"email": email, "provider": "google"})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _build_user_dict(user),
    }


def get_current_user_info(user):
    logger.debug("Current user info requested: user_id=%d", user.id)
    return user
