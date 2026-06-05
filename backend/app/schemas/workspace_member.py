from typing import Literal
from datetime import datetime
from pydantic import BaseModel, Field

WorkspaceMemberRoleEnum = Literal[
    "WORKSPACE_ADMIN", "MODERATOR", "MEMBER", "VIEWER"
]


class WorkspaceMemberAddRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    role: WorkspaceMemberRoleEnum = "MEMBER"


class WorkspaceMemberRoleUpdate(BaseModel):
    role: WorkspaceMemberRoleEnum


class WorkspaceMemberResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    role: WorkspaceMemberRoleEnum
    joined_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}
