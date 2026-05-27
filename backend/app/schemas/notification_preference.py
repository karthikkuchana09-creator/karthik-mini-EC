from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    task_notifications: Optional[bool] = None
    approval_notifications: Optional[bool] = None
    escalation_notifications: Optional[bool] = None
    document_notifications: Optional[bool] = None


class NotificationPreferenceResponse(BaseModel):
    id: int
    user_id: int
    in_app_enabled: bool
    email_enabled: bool
    task_notifications: bool
    approval_notifications: bool
    escalation_notifications: bool
    document_notifications: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
