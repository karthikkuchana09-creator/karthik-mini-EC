from pydantic import BaseModel, field_validator
from typing import Optional, Literal
from datetime import datetime
from app.core.validators import string_length, validate_safe_text
from app.core.sanitizer import sanitize_text

MessageType = Literal["text", "image", "file", "system"]


class ChannelMessageCreate(BaseModel):
    content: str
    message_type: MessageType = "text"

    @field_validator("content", mode="before")
    @classmethod
    def clean_content(cls, v):
        if isinstance(v, str):
            return sanitize_text(v)
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        return validate_safe_text(v)


class ChannelMessageUpdate(BaseModel):
    content: Optional[str] = None
    message_type: Optional[MessageType] = None

    @field_validator("content", mode="before")
    @classmethod
    def clean_content(cls, v):
        if isinstance(v, str):
            return sanitize_text(v)
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        if v:
            return validate_safe_text(v)
        return v


class ChannelMessageResponse(BaseModel):
    id: int
    tenant_id: int
    workspace_id: int
    channel_id: int
    sender_id: int
    content: str
    message_type: str
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
