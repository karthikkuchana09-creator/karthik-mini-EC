from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from app.core.sanitizer import SanitizedStr

FIELD_TYPES = {"TEXT", "NUMBER", "DATE", "SELECT", "FILE"}


# ---------------------------------------------------------------------------
# Form-level schemas
# ---------------------------------------------------------------------------

class FormFieldSchema(BaseModel):
    type: SanitizedStr = Field(..., description=f"One of: {', '.join(sorted(FIELD_TYPES))}")
    label: SanitizedStr
    required: bool = False
    placeholder: Optional[SanitizedStr] = None
    options: Optional[list[str]] = None
    order: int = 0


class FormCreate(BaseModel):
    title: SanitizedStr
    description: Optional[SanitizedStr] = None
    status: SanitizedStr = "draft"
    fields_config: list[FormFieldSchema] = []


class FormUpdate(BaseModel):
    title: Optional[SanitizedStr] = None
    description: Optional[SanitizedStr] = None
    status: Optional[SanitizedStr] = None
    fields_config: Optional[list[FormFieldSchema]] = None


class FormOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    fields_config: list[FormFieldSchema] | Any
    created_by: int
    created_at: datetime
    updated_at: datetime
    submission_count: int = 0

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Field-level schemas
# ---------------------------------------------------------------------------

class FormFieldCreate(BaseModel):
    field_type: SanitizedStr = Field(..., description=f"Field type. One of: {', '.join(sorted(FIELD_TYPES))}")
    label: SanitizedStr
    required: bool = False
    placeholder: Optional[SanitizedStr] = None
    options: Optional[list[dict]] = Field(
        None, description="Options for SELECT type: list of {label, value} objects",
    )
    validation_rules: Optional[dict] = Field(
        None, description="Validation rules: {min_length, max_length, min, max, pattern, ...}",
    )
    sort_order: int = 0


class FormFieldUpdate(BaseModel):
    field_type: Optional[SanitizedStr] = None
    label: Optional[SanitizedStr] = None
    required: Optional[bool] = None
    placeholder: Optional[SanitizedStr] = None
    options: Optional[list[dict]] = None
    validation_rules: Optional[dict] = None
    sort_order: Optional[int] = None


class FormFieldOut(BaseModel):
    id: int
    form_id: int
    field_type: str
    label: str
    required: bool
    placeholder: Optional[str] = None
    options: Optional[list[dict]] = None
    validation_rules: Optional[dict] = None
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Submission schemas
# ---------------------------------------------------------------------------

class FormSubmissionCreate(BaseModel):
    data: dict


class FormSubmissionOut(BaseModel):
    id: int
    form_id: int
    submitted_by: int
    data: dict
    created_at: datetime

    class Config:
        from_attributes = True
