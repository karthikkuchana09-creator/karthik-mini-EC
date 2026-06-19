from typing import Literal, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, model_validator

WorkspaceMemberRoleEnum = Literal[
    "WORKSPACE_ADMIN", "MODERATOR", "MEMBER", "VIEWER"
]


class WorkspaceMemberAddRequest(BaseModel):
    user_id: Optional[int] = Field(None, gt=0)
    email: str = ""
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
    name: str = ""
    email: str = ""

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def populate_user_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        user = getattr(data, "user", None)
        if user is not None:
            data.name = user.name or ""
            data.email = user.email or ""
        return data
