from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.core.validators import string_length, validate_password_strength
from app.core.sanitizer import sanitize_name, sanitize_email

OnboardingStatusEnum = Literal["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"]


class TenantOnboardRequest(BaseModel):
    tenant_name: str
    contact_email: EmailStr
    admin_name: str
    admin_email: EmailStr
    admin_password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None

    @field_validator("tenant_name", mode="before")
    @classmethod
    def clean_tenant_name(cls, v):
        if isinstance(v, str):
            return sanitize_name(v)
        return v

    @field_validator("tenant_name")
    @classmethod
    def validate_tenant_name(cls, v):
        return string_length(1, 255)(v)

    @field_validator("admin_name", mode="before")
    @classmethod
    def clean_admin_name(cls, v):
        if isinstance(v, str):
            return sanitize_name(v)
        return v

    @field_validator("admin_name")
    @classmethod
    def validate_admin_name(cls, v):
        return string_length(1, 100)(v)

    @field_validator("contact_email", "admin_email", mode="before")
    @classmethod
    def clean_emails(cls, v):
        if isinstance(v, str):
            return sanitize_email(v)
        return v

    @field_validator("admin_password")
    @classmethod
    def validate_admin_password(cls, v):
        return validate_password_strength(v)


class TenantAdminCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        if isinstance(v, str):
            return sanitize_name(v)
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return string_length(1, 100)(v)

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


class TenantOnboardingStatusResponse(BaseModel):
    id: int
    tenant_id: int
    admin_user_id: Optional[int] = None
    onboarding_status: OnboardingStatusEnum
    admin_created: bool
    default_workspace_created: bool
    settings_created: bool
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TenantOnboardResponse(BaseModel):
    tenant_id: int
    admin_user_id: int
    onboarding_id: int
    onboarding_status: OnboardingStatusEnum
    message: str = "Tenant onboarding completed successfully"
