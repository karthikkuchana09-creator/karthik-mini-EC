from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SaasSummaryResponse(BaseModel):
    total_tenants: int
    active_tenants: int
    suspended_tenants: int
    trial_tenants: int
    cancelled_tenants: int
    total_workspaces: int
    total_channels: int
    total_users: int


class TenantGrowthItem(BaseModel):
    date: str
    count: int


class UsageItem(BaseModel):
    tenant_id: int
    tenant_name: str
    slug: str
    workspace_count: int
    channel_count: int
    member_count: int
    storage_used_mb: float


class TopTenantItem(BaseModel):
    tenant_id: int
    tenant_name: str
    slug: str
    status: str
    workspace_count: int
    channel_count: int
    storage_used_mb: float
    created_at: datetime
