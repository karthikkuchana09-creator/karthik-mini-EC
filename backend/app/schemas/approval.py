from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.core.validators import string_length, TITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH, validate_safe_text
from app.core.sanitizer import sanitize_text


class ApprovalCreate(BaseModel):
    title: str
    description: Optional[str] = None

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


class ApprovalAction(BaseModel):
    action: str
    comment: Optional[str] = None

    @field_validator("comment", mode="before")
    @classmethod
    def clean_comment(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=DESCRIPTION_MAX_LENGTH)
        return v

    @field_validator("comment")
    @classmethod
    def validate_comment_safe(cls, v):
        if v:
            return validate_safe_text(v)
        return v


class ApprovalOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    requested_by: int
    status: str
    current_level: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
