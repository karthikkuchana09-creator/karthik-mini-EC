from typing import Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, model_validator


class ProjectTeamAssignRequest(BaseModel):
    team_id: int = Field(gt=0)


class ProjectTeamResponse(BaseModel):
    id: int
    project_id: int
    team_id: int
    name: str = ""
    lead: Optional[str] = None
    member_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def populate_team_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        team = getattr(data, "team", None)
        if team is not None:
            data.name = team.name or ""
            data.member_count = len(team.members) if team.members else 0
            lead_member = next(
                (m for m in (team.members or []) if m.role == "LEAD"),
                None,
            )
            if lead_member and lead_member.user:
                data.lead = lead_member.user.name
        return data
