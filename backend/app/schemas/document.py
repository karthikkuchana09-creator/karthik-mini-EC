from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.core.sanitizer import sanitize_filename
from app.core.validators import string_length


class DocumentCreate(BaseModel):
    file_name: str
    task_id: Optional[int] = None

    @field_validator("file_name", mode="before")
    @classmethod
    def clean_filename(cls, v):
        if isinstance(v, str):
            return sanitize_filename(v)
        return v

    @field_validator("file_name")
    @classmethod
    def validate_filename_length(cls, v):
        return string_length(1, 255)(v)


class DocumentOut(BaseModel):
    id: int
    file_name: str
    file_path: str
    version: int
    uploaded_by: int
    task_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class TaskDocumentsOut(BaseModel):
    task_id: int
    total: int
    documents: list[DocumentOut]
