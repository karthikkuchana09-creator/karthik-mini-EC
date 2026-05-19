from enum import Enum
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class KanbanAction(str, Enum):
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_DELETED = "task_deleted"
    TASK_STATUS_CHANGED = "task_status_changed"
    TASK_REORDERED = "task_reordered"
    KANBAN_RESYNC = "kanban_resync"


class KanbanTaskData(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[str] = None
    created_by_id: int
    assigned_to_id: Optional[int] = None
    updated_at: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    creator_name: Optional[str] = None


class KanbanEventPayload(BaseModel):
    action: KanbanAction
    task: KanbanTaskData
    source_column: Optional[str] = None
    destination_column: Optional[str] = None
    previous_status: Optional[str] = None
    task_index: Optional[int] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class KanbanEvent(BaseModel):
    type: str = "kanban"
    payload: KanbanEventPayload


class KanbanConflict(BaseModel):
    has_conflict: bool = False
    server_task: Optional[KanbanTaskData] = None
    message: str = ""


def detect_conflict(client_updated_at: Optional[str], server_updated_at: Optional[str]) -> KanbanConflict:
    if not client_updated_at or not server_updated_at:
        return KanbanConflict()

    try:
        client_ts = datetime.fromisoformat(client_updated_at)
        server_ts = datetime.fromisoformat(server_updated_at)
    except (ValueError, TypeError):
        return KanbanConflict()

    diff = (server_ts - client_ts).total_seconds()
    if diff > 2.0:
        return KanbanConflict(
            has_conflict=True,
            message=f"Task was modified by another user {diff:.0f}s ago. Refresh to see latest.",
        )
    return KanbanConflict()


def build_kanban_task_data(task) -> KanbanTaskData:
    assignee = getattr(task, "assignee", None)
    creator = getattr(task, "creator", None)

    return KanbanTaskData(
        id=task.id,
        title=task.title,
        description=getattr(task, "description", None),
        status=task.status,
        priority=getattr(task, "priority", "medium"),
        due_date=task.due_date.isoformat() if getattr(task, "due_date", None) else None,
        created_by_id=task.created_by_id,
        assigned_to_id=getattr(task, "assigned_to_id", None),
        updated_at=task.updated_at.isoformat() if getattr(task, "updated_at", None) else None,
        assignee_name=assignee.name if assignee else None,
        assignee_email=assignee.email if assignee else None,
        creator_name=creator.name if creator else None,
    )
