from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

DocumentType = Literal["REQUIREMENT", "SPECIFICATION", "REFERENCE", "DELIVERABLE", "OTHER"]


class ApprovalDocumentUpload(BaseModel):
    document_type: DocumentType = "OTHER"


class ApprovalDocumentResponse(BaseModel):
    id: int
    tenant_id: int
    approval_id: int
    file_name: str
    file_size: int
    mime_type: str
    uploaded_by: int
    document_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
