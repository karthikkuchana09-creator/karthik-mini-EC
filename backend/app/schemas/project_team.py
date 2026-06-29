from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ProjectTeamAssignRequest(BaseModel):
    team_id: int = Field(gt=0)


class ProjectTeamResponse(BaseModel):
    id: int
    project_id: int
    team_id: int
    team_name: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}
