from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate
from app.schemas.auth import RefreshRequest, LogoutRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.api.deps import get_db, get_current_user, rate_limit
from app.core.config import settings
from app.services.auth_service import (
    register_user,
    login_user,
    refresh_access_token,
    logout_user,
    forgot_password,
    reset_password,
    get_google_login_url,
    google_oauth_callback,
    get_current_user_info,
)
router = APIRouter(prefix="/auth")


@router.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db),
    _=Depends(rate_limit(settings.RATE_LIMIT_REGISTER, settings.RATE_LIMIT_REGISTER_WINDOW, "register")),
):
    return register_user(db, user)


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    _=Depends(rate_limit(settings.RATE_LIMIT_LOGIN, settings.RATE_LIMIT_LOGIN_WINDOW, "login")),
):
    return login_user(db, form_data.username, form_data.password)


@router.post("/refresh")
def refresh(
    body: RefreshRequest,
    db: Session = Depends(get_db),
    _=Depends(rate_limit(settings.RATE_LIMIT_REFRESH, settings.RATE_LIMIT_REFRESH_WINDOW, "refresh")),
):
    return refresh_access_token(db, body.refresh_token)


@router.post("/logout")
def logout(
    body: LogoutRequest,
    db: Session = Depends(get_db),
):
    return logout_user(db, body.refresh_token)


@router.post("/forgot-password")
def forgot(
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    _=Depends(rate_limit(settings.RATE_LIMIT_FORGOT_PASSWORD, settings.RATE_LIMIT_FORGOT_PASSWORD_WINDOW, "forgot_password")),
):
    return forgot_password(db, body.email)


@router.post("/reset-password")
def reset(
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
    _=Depends(rate_limit(settings.RATE_LIMIT_FORGOT_PASSWORD, settings.RATE_LIMIT_FORGOT_PASSWORD_WINDOW, "reset_password")),
):
    return reset_password(db, body.token, body.new_password)


@router.get("/google/login")
def google_login():
    return get_google_login_url()


@router.get("/google/callback")
def google_callback(
    code: str = Query(...),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    result = google_oauth_callback(db, code, state)
    frontend_url = settings.FRONTEND_URL
    redirect_url = (
        f"{frontend_url}/auth/google/callback"
        f"?access_token={result['access_token']}"
        f"&refresh_token={result['refresh_token']}"
        f"&user={result['user']['id']}|{result['user']['email']}|{result['user']['role']}"
    )
    return RedirectResponse(url=redirect_url)


@router.get("/me")
def get_me(user=Depends(get_current_user)):
    return get_current_user_info(user) 