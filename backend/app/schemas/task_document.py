from pydantic import BaseModel, field_validator
from typing import Optional, Literal
from datetime import datetime
from app.core.validators import string_length
from app.core.sanitizer import sanitize_filename

DocumentType = Literal["REQUIREMENT", "SPECIFICATION", "REFERENCE", "DELIVERABLE", "OTHER"]


class TaskDocumentUpload(BaseModel):
    document_type: DocumentType = "OTHER"


class TaskDocumentResponse(BaseModel):
    id: int
    tenant_id: int
    task_id: int
    file_name: str
    file_size: int
    mime_type: str
    uploaded_by: int
    document_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
