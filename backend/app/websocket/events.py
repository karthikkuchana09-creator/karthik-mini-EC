from enum import Enum
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class EventType(str, Enum):
    SYSTEM = "system"
    TASK = "task"
    APPROVAL = "approval"
    DOCUMENT = "document"
    NOTIFICATION = "notification"
    KANBAN = "kanban"
    HEARTBEAT = "heartbeat"
    ERROR = "error"


class BaseEvent(BaseModel):
    type: EventType
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class PersonalNotificationEvent(BaseEvent):
    type: EventType = EventType.NOTIFICATION
    notification_id: int
    message: str
    user_id: int

    def __init__(self, **data):
        super().__init__(**data)
        self.payload = {
            "id": self.notification_id,
            "message": self.message,
            "user_id": self.user_id,
        }


class SystemEvent(BaseEvent):
    type: EventType = EventType.SYSTEM

    def __init__(self, message: str, level: str = "info", **extra):
        payload = {"message": message, "level": level, **extra}
        super().__init__(payload=payload)


class TaskEvent(BaseEvent):
    type: EventType = EventType.TASK

    def __init__(
        self,
        action: str,
        task_id: int,
        task_title: str,
        assigned_user_id: Optional[int] = None,
        **extra,
    ):
        payload = {
            "action": action,
            "task_id": task_id,
            "task_title": task_title,
            **extra,
        }
        if assigned_user_id is not None:
            payload["assigned_user_id"] = assigned_user_id
        super().__init__(payload=payload)


class ApprovalEvent(BaseEvent):
    type: EventType = EventType.APPROVAL

    def __init__(
        self,
        action: str,
        approval_id: int,
        task_id: int,
        task_title: str,
        target_user_id: Optional[int] = None,
        **extra,
    ):
        payload = {
            "action": action,
            "approval_id": approval_id,
            "task_id": task_id,
            "task_title": task_title,
            **extra,
        }
        if target_user_id is not None:
            payload["target_user_id"] = target_user_id
        super().__init__(payload=payload)


class DocumentEvent(BaseEvent):
    type: EventType = EventType.DOCUMENT

    def __init__(
        self,
        action: str,
        document_id: int,
        filename: str,
        uploaded_by: int,
        task_id: Optional[int] = None,
        **extra,
    ):
        payload = {
            "action": action,
            "document_id": document_id,
            "filename": filename,
            "uploaded_by": uploaded_by,
            **extra,
        }
        if task_id is not None:
            payload["task_id"] = task_id
        super().__init__(payload=payload)
