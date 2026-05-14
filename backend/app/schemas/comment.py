from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.core.validators import validate_safe_text, COMMENT_MAX_LENGTH
from app.core.sanitizer import sanitize_text


class CommentCreate(BaseModel):
    content: str
    is_internal: Optional[bool] = False

    @field_validator("content", mode="before")
    @classmethod
    def clean_content(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=COMMENT_MAX_LENGTH)
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        return validate_safe_text(v)


class CommentOut(BaseModel):
    id: int
    task_id: int
    user_id: int
    content: str
    is_internal: bool
    created_at: datetime

    class Config:
        from_attributes = True
