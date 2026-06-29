from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel

DocumentTypeEnum = Literal["REQUIREMENT", "DESIGN", "TEST", "RELEASE", "OTHER"]


class ProjectDocumentUploadResponse(BaseModel):
    id: int
    project_id: int
    file_name: str
    file_size: int
    mime_type: str
    document_type: DocumentTypeEnum
    uploaded_by: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectDocumentOut(BaseModel):
    id: int
    project_id: int
    file_name: str
    file_size: int
    mime_type: str
    document_type: DocumentTypeEnum
    uploaded_by: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectDocumentListResponse(BaseModel):
    total: int
    documents: list[ProjectDocumentOut]
