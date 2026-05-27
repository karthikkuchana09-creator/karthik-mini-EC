from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.core.validators import string_length, validate_safe_text
from app.core.sanitizer import sanitize_text


class SLARuleCreate(BaseModel):
    module_name: str
    priority: str
    allowed_hours: int
    escalation_enabled: bool = False
    escalation_after_hours: Optional[int] = None

    @field_validator("module_name", mode="before")
    @classmethod
    def clean_module_name(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=100)
        return v

    @field_validator("module_name")
    @classmethod
    def validate_module_name_length(cls, v):
        return string_length(1, 100)(v)

    @field_validator("priority", mode="before")
    @classmethod
    def clean_priority(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=50)
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority_length(cls, v):
        return string_length(1, 50)(v)

    @field_validator("allowed_hours")
    @classmethod
    def validate_allowed_hours(cls, v):
        if v < 1:
            raise ValueError("allowed_hours must be at least 1")
        return v

    @field_validator("escalation_after_hours")
    @classmethod
    def validate_escalation_after_hours(cls, v):
        if v is not None and v < 1:
            raise ValueError("escalation_after_hours must be at least 1")
        return v


class SLARuleUpdate(BaseModel):
    module_name: Optional[str] = None
    priority: Optional[str] = None
    allowed_hours: Optional[int] = None
    escalation_enabled: Optional[bool] = None
    escalation_after_hours: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("module_name", mode="before")
    @classmethod
    def clean_module_name(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=100)
        return v

    @field_validator("priority", mode="before")
    @classmethod
    def clean_priority(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=50)
        return v

    @field_validator("allowed_hours")
    @classmethod
    def validate_allowed_hours(cls, v):
        if v is not None and v < 1:
            raise ValueError("allowed_hours must be at least 1")
        return v

    @field_validator("escalation_after_hours")
    @classmethod
    def validate_escalation_after_hours(cls, v):
        if v is not None and v < 1:
            raise ValueError("escalation_after_hours must be at least 1")
        return v


class SLARuleResponse(BaseModel):
    id: int
    module_name: str
    priority: str
    allowed_hours: int
    escalation_enabled: bool
    escalation_after_hours: Optional[int]
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SLARuleFilter(BaseModel):
    module_name: Optional[str] = None
    priority: Optional[str] = None
    is_active: Optional[bool] = None
    created_by: Optional[int] = None
    q: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: str = "desc"
    page: int = 1
    size: int = 20
