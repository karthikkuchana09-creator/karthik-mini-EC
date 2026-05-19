from app.websocket.manager import ConnectionManager, manager
from app.websocket.events import (
    EventType,
    BaseEvent,
    SystemEvent,
    TaskEvent,
    ApprovalEvent,
    DocumentEvent,
    PersonalNotificationEvent,
)
from app.websocket.auth import (
    WebSocketUser,
    verify_ws_token,
    verify_ws_token_or_close,
    require_ws_role,
)
from app.websocket.kanban import (
    KanbanAction,
    KanbanTaskData,
    KanbanEventPayload,
    KanbanEvent,
    KanbanConflict,
    build_kanban_task_data,
    detect_conflict,
)

__all__ = [
    "ConnectionManager",
    "manager",
    "EventType",
    "BaseEvent",
    "SystemEvent",
    "TaskEvent",
    "ApprovalEvent",
    "DocumentEvent",
    "PersonalNotificationEvent",
    "WebSocketUser",
    "verify_ws_token",
    "verify_ws_token_or_close",
    "require_ws_role",
    "KanbanAction",
    "KanbanTaskData",
    "KanbanEventPayload",
    "KanbanEvent",
    "KanbanConflict",
    "build_kanban_task_data",
    "detect_conflict",
]
