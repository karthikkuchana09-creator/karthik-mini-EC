from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import string_length
from app.core.sanitizer import sanitize_text


class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workspace_id: Optional[int] = None

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


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v


class TeamResponse(BaseModel):
    id: int
    tenant_id: int
    workspace_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    created_by: Optional[int] = None
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
