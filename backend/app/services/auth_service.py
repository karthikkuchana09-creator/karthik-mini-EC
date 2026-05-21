import uuid
import httpx
from typing import Optional
from urllib.parse import urlencode
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User, UserRole, SubscriptionRole
from app.models.organization import Organization, SubscriptionPlan
from app.models.organization_settings import OrganizationSettings
from app.models.refresh_token import RefreshToken
from app.models.password_reset_token import PasswordResetToken
from app.schemas.user import UserCreate
from app.schemas.auth import OrganizationRegisterRequest
from app.core.security import hash_password, verify_password, create_access_token, create_tenant_access_token, create_refresh_token, create_reset_token, hash_token_raw
from app.core.config import settings
from app.core.log import get_logger
from app.core.tenant import TenantResolver
from app.services.email_service import send_reset_password_email
from app.services.audit_log_service import log_action
from app.services.tenant_service import TenantService

logger = get_logger("auth_service")


def _build_user_dict(user: User):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "subscription_role": user.subscription_role.value if hasattr(user.subscription_role, "value") else user.subscription_role,
        "tenant_id": user.tenant_id,
        "avatar_url": user.avatar_url,
        "auth_provider": user.auth_provider,
        "is_active": user.is_active,
    }


def _build_tenant_dict(org: Organization):
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "logo": org.logo,
        "subscription_plan": org.subscription_plan.value if hasattr(org.subscription_plan, "value") else org.subscription_plan,
        "is_active": org.is_active,
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


def register_user(db: Session, user_data: UserCreate):
    logger.info("Registration attempt: email=%s role=%s", user_data.email, user_data.role)

    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        logger.warning("Registration failed: email exists email=%s", user_data.email)
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role or UserRole.employee,
        tenant_id=user_data.tenant_id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("User registered id=%d email=%s role=%s", new_user.id, new_user.email, new_user.role)
    return {
        "id": new_user.id,
        "email": new_user.email,
        "name": new_user.name,
        "role": new_user.role.value if hasattr(new_user.role, "value") else new_user.role,
        "tenant_id": new_user.tenant_id,
    }


def register_org_user(db: Session, data: OrganizationRegisterRequest) -> dict:
    logger.info("Org registration attempt: email=%s org_slug=%s", data.email, data.org_slug)

    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    org = db.query(Organization).filter(Organization.slug == data.org_slug).first()
    if org:
        raise HTTPException(status_code=409, detail="Organization slug already exists")

    org = Organization(
        name=data.org_name,
        slug=data.org_slug,
        subscription_plan=SubscriptionPlan.free,
        is_active=True,
    )
    db.add(org)
    db.flush()

    settings = OrganizationSettings(organization_id=org.id)
    db.add(settings)

    new_user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role or UserRole.employee,
        subscription_role=SubscriptionRole.owner,
        tenant_id=org.id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(org)
    db.refresh(new_user)

    TenantResolver.invalidate_cache(org.slug)
    TenantResolver.invalidate_cache(org.id)

    logger.info("Org+user registered: org_id=%d user_id=%d", org.id, new_user.id)

    access_token = create_tenant_access_token(
        user_id=new_user.id,
        role=new_user.role.value if hasattr(new_user.role, "value") else new_user.role,
        tenant_id=org.id,
        tenant_slug=org.slug,
        subscription_role=new_user.subscription_role.value if hasattr(new_user.subscription_role, "value") else new_user.subscription_role,
    )
    refresh_token = _issue_refresh_token(db, new_user.id)

    log_action(db, new_user.id, "org_register", "organization", org.id, new_value={"org_slug": org.slug})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _build_user_dict(new_user),
        "tenant": _build_tenant_dict(org),
    }


def login_user(db: Session, email: str, password: str) -> dict:
    logger.info("Login attempt: email=%s", email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        logger.warning("Login failed: invalid credentials email=%s", email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        logger.warning("Login failed: inactive user email=%s", email)
        raise HTTPException(status_code=403, detail="Account is inactive")

    tenant = None
    tenant_slug = None
    subscription_role = user.subscription_role.value if hasattr(user.subscription_role, "value") else user.subscription_role

    if user.tenant_id:
        org = db.query(Organization).filter(Organization.id == user.tenant_id).first()
        if org:
            if not org.is_active:
                raise HTTPException(status_code=403, detail="Organization is inactive")
            tenant = _build_tenant_dict(org)
            tenant_slug = org.slug

    access_token = create_tenant_access_token(
        user_id=user.id,
        role=user.role.value if hasattr(user.role, "value") else user.role,
        tenant_id=user.tenant_id,
        tenant_slug=tenant_slug,
        subscription_role=subscription_role,
    )
    refresh_token = _issue_refresh_token(db, user.id)

    logger.info("Login success: user_id=%d email=%s role=%s", user.id, user.email, user.role)
    log_action(db, user.id, "login", "auth", user.id, new_value={"email": user.email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _build_user_dict(user),
        "tenant": tenant,
    }


def login_org_user(db: Session, email: str, password: str, tenant_slug: Optional[str]) -> dict:
    logger.info("Org-scoped login attempt: email=%s tenant_slug=%s", email, tenant_slug)

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    org = None
    if tenant_slug:
        org = db.query(Organization).filter(Organization.slug == tenant_slug).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        if not org.is_active:
            raise HTTPException(status_code=403, detail="Organization is inactive")
        if user.tenant_id and user.tenant_id != org.id:
            raise HTTPException(status_code=403, detail="User does not belong to this organization")
    elif user.tenant_id:
        org = db.query(Organization).filter(Organization.id == user.tenant_id).first()
        if org and not org.is_active:
            raise HTTPException(status_code=403, detail="Organization is inactive")

    subscription_role = user.subscription_role.value if hasattr(user.subscription_role, "value") else user.subscription_role

    access_token = create_tenant_access_token(
        user_id=user.id,
        role=user.role.value if hasattr(user.role, "value") else user.role,
        tenant_id=user.tenant_id or (org.id if org else None),
        tenant_slug=org.slug if org else None,
        subscription_role=subscription_role,
    )
    refresh_token = _issue_refresh_token(db, user.id)

    log_action(db, user.id, "login", "auth", user.id, new_value={"email": email, "tenant": tenant_slug})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _build_user_dict(user),
        "tenant": _build_tenant_dict(org) if org else None,
    }


def refresh_access_token(db: Session, raw_refresh_token: str) -> dict:
    token_hash = hash_token_raw(raw_refresh_token)
    stored_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash
    ).first()
    if not stored_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if stored_token.is_revoked:
        _revoke_token_family(db, stored_token)
        raise HTTPException(status_code=401, detail="Refresh token has been revoked")
    if stored_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token has expired")

    user = db.query(User).filter(User.id == stored_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    stored_token.is_revoked = True
    stored_token.revoked_at = datetime.utcnow()

    new_raw_token = _issue_refresh_token(db, user.id)
    stored_token.replaced_by_token_hash = hash_token_raw(new_raw_token)

    tenant = None
    tenant_slug = None
    if user.tenant_id:
        org = db.query(Organization).filter(Organization.id == user.tenant_id).first()
        if org:
            tenant = _build_tenant_dict(org)
            tenant_slug = org.slug

    subscription_role = user.subscription_role.value if hasattr(user.subscription_role, "value") else user.subscription_role
    access_token = create_tenant_access_token(
        user_id=user.id,
        role=user.role.value if hasattr(user.role, "value") else user.role,
        tenant_id=user.tenant_id,
        tenant_slug=tenant_slug,
        subscription_role=subscription_role,
    )
    db.commit()

    logger.info("Token rotated for user_id=%d", user.id)
    return {
        "access_token": access_token,
        "refresh_token": new_raw_token,
        "token_type": "bearer",
        "tenant": tenant,
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
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if stored_token.is_used:
        raise HTTPException(status_code=400, detail="Reset token has already been used")
    if stored_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    user = db.query(User).filter(User.id == stored_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    user.hashed_password = hash_password(new_password)
    stored_token.is_used = True
    stored_token.used_at = datetime.utcnow()
    db.commit()
    logger.info("Password reset for user_id=%d", user.id)
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
    return {"auth_url": auth_url}


def google_oauth_callback(db: Session, code: str, state: Optional[str] = None):
    logger.info("Google OAuth callback")
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
        logger.error("Google token exchange failed: %s", e)
        raise HTTPException(status_code=400, detail="Failed to authenticate with Google")

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
            subscription_role=SubscriptionRole.member,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("New user via Google: user_id=%d email=%s", user.id, email)

    tenant = None
    tenant_slug = None
    if user.tenant_id:
        org = db.query(Organization).filter(Organization.id == user.tenant_id).first()
        if org:
            tenant = _build_tenant_dict(org)
            tenant_slug = org.slug

    subscription_role = user.subscription_role.value if hasattr(user.subscription_role, "value") else user.subscription_role
    access_token = create_tenant_access_token(
        user_id=user.id,
        role=user.role.value if hasattr(user.role, "value") else user.role,
        tenant_id=user.tenant_id,
        tenant_slug=tenant_slug,
        subscription_role=subscription_role,
    )
    refresh_token = _issue_refresh_token(db, user.id)
    log_action(db, user.id, "login", "auth", user.id, new_value={"email": email, "provider": "google"})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _build_user_dict(user),
        "tenant": tenant,
    }


def get_current_user_info(user):
    return user
