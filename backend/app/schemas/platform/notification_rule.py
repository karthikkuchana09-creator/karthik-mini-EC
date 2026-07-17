from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.core.sanitizer import SanitizedStr

EVENT_TYPES = {
    "task_assignment", "task_status", "approval_request", "approval_action",
    "meeting_reminder", "escalation_alert", "mention_alert", "document_update",
    "comment", "system_alert", "sla_breach",
}
CHANNELS = {"in_app", "email", "both"}


class NotificationRuleCreate(BaseModel):
    name: SanitizedStr = Field(..., description="Rule name")
    description: Optional[SanitizedStr] = Field(None, description="Rule description")
    event_type: SanitizedStr = Field(
        ..., description=f"Event trigger. One of: {', '.join(sorted(EVENT_TYPES))}",
    )
    channel: SanitizedStr = Field(
        "in_app", description="Notification channel: in_app, email, or both",
    )
    condition_config: Optional[dict] = Field(
        None,
        description='Conditions for rule to fire. Example: {"priority": "high", "roles": ["manager"]}',
    )
    template_config: Optional[dict] = Field(
        None,
        description='Message templates. Example: {"subject": "Task {{task.title}} is overdue", "body": "Task #{{task.id}}: {{task.title}} was due on {{task.due_date}}"}',
    )
    recipient_config: Optional[dict] = Field(
        None,
        description='Recipient rules. Example: {"roles": ["admin", "manager"], "include_creator": true}',
    )
    is_active: bool = True


class NotificationRuleUpdate(BaseModel):
    name: Optional[SanitizedStr] = None
    description: Optional[SanitizedStr] = None
    event_type: Optional[SanitizedStr] = None
    channel: Optional[SanitizedStr] = None
    condition_config: Optional[dict] = None
    template_config: Optional[dict] = None
    recipient_config: Optional[dict] = None
    is_active: Optional[bool] = None


class NotificationRuleOut(BaseModel):
    id: int
    tenant_id: int
    name: str
    description: Optional[str] = None
    event_type: str
    channel: str
    condition_config: Optional[dict] = None
    template_config: Optional[dict] = None
    recipient_config: Optional[dict] = None
    is_active: bool
    is_deleted: bool
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
