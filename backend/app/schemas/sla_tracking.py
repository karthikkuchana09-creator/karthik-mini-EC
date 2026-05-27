from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.core.validators import string_length
from app.core.sanitizer import sanitize_text


class SLATrackingResponse(BaseModel):
    id: int
    module_name: str
    record_id: int
    sla_rule_id: int
    start_time: datetime
    due_time: datetime
    completed_time: Optional[datetime]
    status: str
    breach_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SLATrackingComplete(BaseModel):
    breach_reason: Optional[str] = None


class SLATrackingFilter(BaseModel):
    module_name: Optional[str] = None
    status: Optional[str] = None
    sla_rule_id: Optional[int] = None
    record_id: Optional[int] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    q: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: str = "desc"
    page: int = 1
    size: int = 20
