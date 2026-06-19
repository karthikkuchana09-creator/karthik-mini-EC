from pydantic import BaseModel, field_validator
from typing import Optional, Literal
from datetime import datetime
from app.core.validators import string_length, TITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH, validate_safe_text, validate_future_datetime
from app.core.sanitizer import sanitize_text

TaskStatus = Literal["todo", "in_progress", "review", "done"]
TaskPriority = Literal["low", "medium", "high"]


class ChannelTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = "medium"
    due_date: Optional[datetime] = None
    assigned_to_id: int

    @field_validator("title", mode="before")
    @classmethod
    def clean_title(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=TITLE_MAX_LENGTH)
        return v

    @field_validator("title")
    @classmethod
    def validate_title_length(cls, v):
        return string_length(1, TITLE_MAX_LENGTH)(v)

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=DESCRIPTION_MAX_LENGTH)
        return v

    @field_validator("description")
    @classmethod
    def validate_description_safe(cls, v):
        if v:
            return validate_safe_text(v)
        return v

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v):
        if v:
            return validate_future_datetime(v)
        return v


class ChannelTaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime] = None
    sla_status: Optional[str] = None
    sla_due_time: Optional[datetime] = None
    is_sla_breached: bool = False
    created_by_id: int
    assigned_to_id: int
    workspace_id: int
    channel_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChannelTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None

    @field_validator("title", mode="before")
    @classmethod
    def clean_title(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=TITLE_MAX_LENGTH)
        return v

    @field_validator("title")
    @classmethod
    def validate_title_length(cls, v):
        if v:
            return string_length(1, TITLE_MAX_LENGTH)(v)
        return v

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=DESCRIPTION_MAX_LENGTH)
        return v

    @field_validator("description")
    @classmethod
    def validate_description_safe(cls, v):
        if v:
            return validate_safe_text(v)
        return v

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v):
        if v:
            return validate_future_datetime(v)
        return v


class ChannelTaskStatusUpdate(BaseModel):
    status: TaskStatus


class ChannelTaskAssign(BaseModel):
    assigned_to_id: int
