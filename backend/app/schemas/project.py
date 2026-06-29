from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import string_length
from app.core.sanitizer import sanitize_text

ProjectStatusEnum = Literal["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]
ProjectPriorityEnum = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class ProjectCreate(BaseModel):
    tenant_id: int
    workspace_id: int
    name: str
    description: Optional[str] = None
    status: ProjectStatusEnum = "PLANNING"
    priority: ProjectPriorityEnum = "MEDIUM"
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_by: int

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return string_length(1, 255)(v)

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[ProjectStatusEnum] = None
    priority: Optional[ProjectPriorityEnum] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_by: Optional[int] = None

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v


class ProjectResponse(BaseModel):
    id: int
    tenant_id: int
    workspace_id: int
    name: str
    description: Optional[str] = None
    status: ProjectStatusEnum
    priority: ProjectPriorityEnum
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    is_archived: bool
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
