from pydantic import BaseModel, Field
from typing import Optional, Any
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
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    metadata: Optional[dict] = None
    ip_address: Optional[str] = None
    timestamp: str


class AuditLogPaginated(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    size: int
    pages: int


class AuditLogDetail(BaseModel):
    id: int
    user_id: Optional[int]
    user: Optional[AuditLogUser]
    action: str
    entity: str
    entity_id: Optional[int]
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    metadata: Optional[dict] = None
    ip_address: Optional[str] = None
    timestamp: str
    is_immutable: bool = True


class ActionCount(BaseModel):
    action: str
    count: int


class EntityCount(BaseModel):
    entity: str
    count: int


class AuditLogStats(BaseModel):
    total_logs: int
    unique_users: int
    unique_actions: int
    actions_by_type: list[ActionCount]
    entities_by_type: list[EntityCount]
    recent_actions: list[AuditLogOut]


class AuditLogExportRow(BaseModel):
    id: int
    user_id: Optional[int]
    user_name: Optional[str]
    user_email: Optional[str]
    action: str
    entity: str
    entity_id: Optional[int]
    old_value: Optional[str]
    new_value: Optional[str]
    ip_address: Optional[str]
    timestamp: str


class AuditLogExport(BaseModel):
    format: str = Field(..., pattern="^(csv|json)$")
    filename: str
    total_records: int
    data: list[AuditLogExportRow]
