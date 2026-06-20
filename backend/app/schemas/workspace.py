from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import string_length
from app.core.sanitizer import sanitize_text

WorkspaceVisibilityEnum = Literal["PUBLIC", "PRIVATE"]


class WorkspaceCreate(BaseModel):
    tenant_id: int
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    visibility: WorkspaceVisibilityEnum = "PUBLIC"
    created_by: int

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return string_length(1, 255)(v)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v):
        if v is not None:
            return string_length(1, 100)(v)
        return v

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    visibility: Optional[WorkspaceVisibilityEnum] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            return string_length(1, 255)(v)
        return v

    @field_validator("description", mode="before")
    @classmethod
    def clean_description(cls, v):
        if isinstance(v, str):
            return sanitize_text(v, max_length=2000)
        return v


class WorkspaceResponse(BaseModel):
    id: int
    tenant_id: int
    name: str
    slug: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    visibility: WorkspaceVisibilityEnum
    created_by: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    channel_count: int = 0
    task_count: int = 0

    model_config = {"from_attributes": True}
