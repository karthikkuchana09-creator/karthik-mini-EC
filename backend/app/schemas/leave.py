from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime
from app.core.validators import string_length, REASON_MAX_LENGTH, validate_safe_text, validate_future_date
from app.core.sanitizer import sanitize_text


class LeaveCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: str

    @field_validator("reason", mode="before")
    @classmethod
    def clean_reason(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=REASON_MAX_LENGTH)
        return v

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v):
        return validate_safe_text(v)

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v):
        return validate_future_date(v)

    @field_validator("end_date")
    @classmethod
    def validate_end_after_start(cls, v, info):
        if info.data.get("start_date") and v < info.data["start_date"]:
            raise ValueError("End date must be after start date")
        return v


class LeaveUpdate(BaseModel):
    leave_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None

    @field_validator("reason", mode="before")
    @classmethod
    def clean_reason(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=REASON_MAX_LENGTH)
        return v

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v):
        if v:
            return validate_safe_text(v)
        return v

    @field_validator("end_date")
    @classmethod
    def validate_end_after_start(cls, v, info):
        if v and info.data.get("start_date") and v < info.data["start_date"]:
            raise ValueError("End date must be after start date")
        return v


class LeaveOut(BaseModel):
    id: int
    user_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
