from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.core.validators import string_length
from app.core.sanitizer import sanitize_name, sanitize_email

TenantStatusEnum = Literal["ACTIVE", "SUSPENDED", "TRIAL", "CANCELLED"]


class TenantCreate(BaseModel):
    name: str
    contact_email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        if isinstance(v, str):
            return sanitize_name(v)
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return string_length(1, 255)(v)

    @field_validator("contact_email", mode="before")
    @classmethod
    def clean_email(cls, v):
        if isinstance(v, str):
            return sanitize_email(v)
        return v


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        if isinstance(v, str):
            return sanitize_name(v)
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return string_length(1, 255)(v)

    @field_validator("contact_email", mode="before")
    @classmethod
    def clean_email(cls, v):
        if isinstance(v, str):
            return sanitize_email(v)
        return v


class TenantResponse(BaseModel):
    id: int
    name: str
    slug: str
    contact_email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None
    status: TenantStatusEnum
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
