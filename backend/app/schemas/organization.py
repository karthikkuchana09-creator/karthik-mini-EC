from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    logo: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    logo: Optional[str] = None
    subscription_plan: Optional[str] = None
    is_active: Optional[bool] = None

class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str
    logo: Optional[str] = None
    subscription_plan: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class OrganizationSettingsUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    company_address: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    max_users: Optional[int] = None
    max_storage_gb: Optional[int] = None
    allowed_auth_providers: Optional[list[str]] = None
    feature_flags: Optional[dict] = None

class OrganizationSettingsResponse(BaseModel):
    id: int
    organization_id: int
    primary_color: str
    secondary_color: str
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    company_address: Optional[str] = None
    timezone: str
    date_format: str
    max_users: int
    max_storage_gb: int
    allowed_auth_providers: list
    feature_flags: dict

    model_config = {"from_attributes": True}

class InviteCreate(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    role: str = Field(default="employee", pattern=r"^(admin|manager|employee)$")

class InviteResponse(BaseModel):
    id: int
    organization_id: int
    email: str
    role: str
    token: str
    status: str
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}

class TenantRegisterResponse(BaseModel):
    organization: OrganizationResponse
    message: str = "Organization registered. Check invite email to activate."
