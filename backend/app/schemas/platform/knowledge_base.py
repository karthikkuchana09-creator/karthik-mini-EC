from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.sanitizer import SanitizedStr


class KnowledgeCategoryCreate(BaseModel):
    name: SanitizedStr
    description: Optional[SanitizedStr] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int = 0


class KnowledgeCategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int
    article_count: int = 0

    class Config:
        from_attributes = True


class ArticleCreate(BaseModel):
    title: SanitizedStr
    content: SanitizedStr
    category_id: Optional[int] = None
    tags: Optional[SanitizedStr] = None
    status: SanitizedStr = "draft"


class ArticleUpdate(BaseModel):
    title: Optional[SanitizedStr] = None
    content: Optional[SanitizedStr] = None
    category_id: Optional[int] = None
    tags: Optional[SanitizedStr] = None
    status: Optional[SanitizedStr] = None


class ArticleOut(BaseModel):
    id: int
    title: str
    content: str
    category_id: Optional[int] = None
    tags: Optional[str] = None
    version: int = 1
    status: str
    author_id: int
    view_count: int
    created_at: datetime
    updated_at: datetime
    category: Optional[KnowledgeCategoryOut] = None

    class Config:
        from_attributes = True


class ArticleVersionOut(BaseModel):
    id: int
    article_id: int
    version_number: int
    title: str
    content: str
    tags: Optional[str] = None
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True
