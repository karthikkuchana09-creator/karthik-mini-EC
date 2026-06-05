from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class TenantCollaborationUsageResponse(BaseModel):
    id: int
    tenant_id: int
    workspace_count: int
    channel_count: int
    member_count: int
    storage_used_mb: float
    last_calculated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TenantCollaborationUsageRecalculateResponse(BaseModel):
    id: int
    tenant_id: int
    workspace_count: int
    channel_count: int
    member_count: int
    storage_used_mb: float
    last_calculated_at: datetime

    model_config = {"from_attributes": True}
