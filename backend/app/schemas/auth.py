from pydantic import BaseModel, EmailStr, field_validator
from app.core.validators import validate_password_strength, string_length
from app.core.sanitizer import sanitize_email


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LogoutRequest(BaseModel):
    refresh_token: str


class LogoutResponse(BaseModel):
    message: str = "Successfully logged out"


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v):
        if isinstance(v, str):
            return sanitize_email(v)
        return v


class ForgotPasswordResponse(BaseModel):
    message: str = "If the email exists, a reset link has been sent"


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        return validate_password_strength(v)


class ResetPasswordResponse(BaseModel):
    message: str = "Password has been reset successfully"


class GoogleAuthUrlResponse(BaseModel):
    auth_url: str
