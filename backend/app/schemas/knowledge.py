from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.core.validators import string_length


class ArticleCreate(BaseModel):
    title: str
    content: str
    category_id: Optional[int] = None
    tags: Optional[str] = None
    status: Optional[str] = "draft"

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        return string_length(1, 255)(v)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        allowed = {"draft", "published", "archived"}
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}")
        return v


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[str] = None
    status: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        if v is not None:
            return string_length(1, 255)(v)
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            allowed = {"draft", "published", "archived"}
            if v not in allowed:
                raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}")
        return v


class ArticleOut(BaseModel):
    id: int
    title: str
    content: str
    category_id: Optional[int]
    tags: Optional[str]
    status: str
    author_id: int
    created_at: datetime
    updated_at: datetime
    view_count: int

    class Config:
        from_attributes = True


class ArticleList(BaseModel):
    id: int
    title: str
    category_id: Optional[int]
    tags: Optional[str]
    status: str
    author_id: int
    created_at: datetime
    updated_at: datetime
    view_count: int

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = 0

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return string_length(1, 255)(v)


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            return string_length(1, 255)(v)
        return v


class CategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon: Optional[str]
    parent_id: Optional[int]
    sort_order: int
    tenant_id: Optional[int]

    class Config:
        from_attributes = True
