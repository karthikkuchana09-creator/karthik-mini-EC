from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AuditLogUser(BaseModel):
    id: int
    name: str
    email: str

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    user: Optional[AuditLogUser]
    action: str
    entity: str
    entity_id: Optional[int]
    timestamp: Optional[str]

class AuditLogPaginated(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AuditLogOut]
