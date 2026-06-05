from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import string_length
from app.core.sanitizer import sanitize_text

ChannelTypeEnum = Literal["PUBLIC", "PRIVATE", "ANNOUNCEMENT", "PROJECT"]


class ChannelCreate(BaseModel):
    tenant_id: int
    workspace_id: int
    name: str
    description: Optional[str] = None
    channel_type: ChannelTypeEnum = "PUBLIC"
    created_by: int

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return string_length(1, 255)(v)

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v


class ChannelUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    channel_type: Optional[ChannelTypeEnum] = None

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v


class ChannelResponse(BaseModel):
    id: int
    tenant_id: int
    workspace_id: int
    name: str
    description: Optional[str] = None
    channel_type: ChannelTypeEnum
    created_by: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
