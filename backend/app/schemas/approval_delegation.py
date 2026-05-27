from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, date
from app.core.validators import validate_safe_text
from app.core.sanitizer import sanitize_text


class ApprovalDelegationCreate(BaseModel):
    delegatee_id: int
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None

    @field_validator("reason", mode="before")
    @classmethod
    def clean_reason(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v

    @field_validator("reason")
    @classmethod
    def validate_reason_safe(cls, v):
        if v:
            return validate_safe_text(v)
        return v

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v):
        if v < datetime.utcnow():
            raise ValueError("start_date must be in the future")
        return v

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v, info):
        if v < datetime.utcnow():
            raise ValueError("end_date must be in the future")
        return v

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, v, info):
        start = info.data.get("start_date")
        if start and v <= start:
            raise ValueError("end_date must be after start_date")
        return v


class ApprovalDelegationCancel(BaseModel):
    reason: Optional[str] = None

    @field_validator("reason", mode="before")
    @classmethod
    def clean_reason(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v


class ApprovalDelegationResponse(BaseModel):
    id: int
    delegator_id: int
    delegatee_id: int
    start_date: datetime
    end_date: datetime
    reason: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ApprovalDelegationFilter(BaseModel):
    delegator_id: Optional[int] = None
    delegatee_id: Optional[int] = None
    is_active: Optional[bool] = None
    q: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: str = "desc"
    page: int = 1
    size: int = 20
