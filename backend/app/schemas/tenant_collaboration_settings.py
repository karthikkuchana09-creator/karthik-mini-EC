from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class TenantCollaborationSettingsUpdate(BaseModel):
    max_workspaces: Optional[int] = Field(None, gt=0)
    max_channels_per_workspace: Optional[int] = Field(None, gt=0)
    max_workspace_members: Optional[int] = Field(None, gt=0)
    max_storage_mb: Optional[int] = Field(None, gt=0)
    workspace_enabled: Optional[bool] = None
    channel_enabled: Optional[bool] = None


class TenantCollaborationSettingsResponse(BaseModel):
    id: int
    tenant_id: int
    max_workspaces: int
    max_channels_per_workspace: int
    max_workspace_members: int
    max_storage_mb: int
    workspace_enabled: bool
    channel_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
