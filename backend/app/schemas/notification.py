from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class NotificationCategory(str, Enum):
    task_assignment = "task_assignment"
    task_status = "task_status"
    approval_request = "approval_request"
    approval_action = "approval_action"
    comment = "comment"
    document_upload = "document_upload"
    system = "system"
    ai_alert = "ai_alert"
    sla_breach = "sla_breach"


class NotificationTypeEnum(str, Enum):
    task = "task"
    approval = "approval"
    escalation = "escalation"
    comment = "comment"
    document = "document"
    sla = "sla"


class NotificationPriorityEnum(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class NotificationCreate(BaseModel):
    user_id: int
    message: str = Field(..., min_length=1, max_length=500)
    type: NotificationCategory = NotificationCategory.system
    notification_type: Optional[NotificationTypeEnum] = None
    priority: NotificationPriorityEnum = NotificationPriorityEnum.medium


class NotificationOut(BaseModel):
    id: int
    user_id: int
    message: str
    type: NotificationCategory
    notification_type: Optional[NotificationTypeEnum] = None
    priority: NotificationPriorityEnum = NotificationPriorityEnum.medium
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationList(BaseModel):
    items: list[NotificationOut]
    total: int
    page: int
    size: int
    pages: int


class UnreadCount(BaseModel):
    unread_count: int


class CategoryCount(BaseModel):
    type: NotificationCategory
    count: int


class NotificationStats(BaseModel):
    total: int
    unread: int
    read: int
    by_category: list[CategoryCount]


class BulkReadRequest(BaseModel):
    notification_ids: list[int] = Field(..., min_length=1)


class NotificationFilter(BaseModel):
    type: Optional[NotificationCategory] = None
    notification_type: Optional[NotificationTypeEnum] = None
    priority: Optional[NotificationPriorityEnum] = None
    is_read: Optional[bool] = None
    q: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: str = "desc"
    page: int = 1
    size: int = 20

