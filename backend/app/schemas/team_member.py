from typing import Literal, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, model_validator

TeamMemberRoleEnum = Literal["LEAD", "MEMBER"]


class TeamMemberAddRequest(BaseModel):
    user_id: int = Field(gt=0)
    role: TeamMemberRoleEnum = "MEMBER"


class TeamMemberResponse(BaseModel):
    id: int
    team_id: int
    user_id: int
    role: TeamMemberRoleEnum
    joined_at: datetime
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
