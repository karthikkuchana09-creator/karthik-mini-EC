from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime
from app.core.sanitizer import SanitizedStr


class SavedSearchCreate(BaseModel):
    name: SanitizedStr = Field(..., min_length=1, max_length=255, description="Saved search name")
    query: dict[str, Any] = Field(..., description="Search parameters: q, entity_types, filters, etc.")


class SavedSearchOut(BaseModel):
    id: int
    tenant_id: int
    user_id: int
    name: str
    query: dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
