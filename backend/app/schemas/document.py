from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentCreate(BaseModel):
    file_name: str
    task_id: Optional[int] = None

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
