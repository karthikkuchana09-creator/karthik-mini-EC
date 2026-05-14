from pydantic import BaseModel, EmailStr, field_validator
from typing import Literal
from app.core.validators import validate_password_strength, validate_safe_name, NAME_MAX_LENGTH
from app.core.sanitizer import sanitize_name, sanitize_email

UserRole = Literal["admin", "manager", "employee"]


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        if isinstance(v, str):
            return sanitize_name(v)
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return validate_safe_name(v)

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v):
        if isinstance(v, str):
            return sanitize_email(v)
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        return validate_password_strength(v)


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    avatar_url: str | None = None
    auth_provider: str = "email"

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool = True

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        if isinstance(v, str):
            return sanitize_name(v)
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return validate_safe_name(v)

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v):
        if isinstance(v, str):
            return sanitize_email(v)
        return v
