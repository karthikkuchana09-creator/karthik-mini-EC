from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.core.validators import string_length, validate_safe_text
from app.core.sanitizer import sanitize_text


class ApprovalEscalationCreate(BaseModel):
    approval_id: int
    escalated_from: int
    escalated_to: int
    reason: Optional[str] = None
    escalation_level: str

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

    @field_validator("escalation_level")
    @classmethod
    def validate_escalation_level(cls, v):
        valid_levels = {"manager", "admin", "higher"}
        if v not in valid_levels:
            raise ValueError(f"escalation_level must be one of: {valid_levels}")
        return v


class ApprovalEscalationResolve(BaseModel):
    resolution_note: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: Optional[str] = None
    email: str

    class Config:
        from_attributes = True


class ApprovalEscalationResponse(BaseModel):
    id: int
    approval_id: int
    escalated_from: int
    escalated_to: int
    reason: Optional[str]
    escalation_level: str
    status: str
    escalated_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


class ApprovalEscalationFilter(BaseModel):
    approval_id: Optional[int] = None
    status: Optional[str] = None
    escalation_level: Optional[str] = None
    escalated_from: Optional[int] = None
    escalated_to: Optional[int] = None
    q: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: str = "desc"
    page: int = 1
    size: int = 20
