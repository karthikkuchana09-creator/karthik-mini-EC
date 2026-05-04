from pydantic import BaseModel
from typing import Optional

class ApprovalCreate(BaseModel):
    title: str
    description: Optional[str] = None

class ApprovalAction(BaseModel):
    action: str  # approved / rejected / hold
    comment: Optional[str] = None