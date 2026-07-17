from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class AnalyticsFilter(BaseModel):
    workspace_id: Optional[int] = Field(None, description="Filter by workspace")
    project_id: Optional[int] = Field(None, description="Filter by project")
    team_id: Optional[int] = Field(None, description="Filter by team")
    start_date: Optional[date] = Field(None, description="Start date (inclusive)")
    end_date: Optional[date] = Field(None, description="End date (inclusive)")


class StatusCount(BaseModel):
    status: str
    count: int


class PriorityCount(BaseModel):
    priority: str
    count: int


class ProjectsAnalytics(BaseModel):
    total: int
    by_status: list[StatusCount]
    by_priority: list[PriorityCount]
    overdue: int
    near_deadline: int


class TeamSummary(BaseModel):
    id: int
    name: str
    member_count: int


class TeamsAnalytics(BaseModel):
    total: int
    total_members: int
    avg_team_size: float
    teams: list[TeamSummary]


class TasksAnalytics(BaseModel):
    total: int
    by_status: list[StatusCount]
    by_priority: list[PriorityCount]
    completed: int
    pending: int
    overdue: int
    avg_completion_time_hours: Optional[float] = None


class UserCount(BaseModel):
    user_id: int
    user_name: str
    count: int


class ApprovalsAnalytics(BaseModel):
    total: int
    by_status: list[StatusCount]
    pending: int
    pending_by_level: list[StatusCount]
    avg_approval_time_hours: Optional[float] = None
    delayed: int


class DocumentsAnalytics(BaseModel):
    total: int
    total_versions: int
    by_uploader: list[UserCount]
    recent_uploads: int
