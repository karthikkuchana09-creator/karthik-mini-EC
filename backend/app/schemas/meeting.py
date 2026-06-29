from typing import Optional, Literal
from datetime import datetime, date, time
from pydantic import BaseModel, Field, field_validator
from app.core.validators import string_length
from app.core.sanitizer import sanitize_text

MeetingStatusEnum = Literal["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]


class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        return string_length(1, 255)(v)

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v


class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    meeting_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    status: Optional[MeetingStatusEnum] = None

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v


class MeetingResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    meeting_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    status: MeetingStatusEnum
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
