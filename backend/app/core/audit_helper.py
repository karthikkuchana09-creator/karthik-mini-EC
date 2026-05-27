"""
Audit helper service.

Provides a simplified decorator and function for auto-logging
audit entries, wrapping the typed enterprise_audit_service methods
with automatic context enrichment from AuditContext.

Usage:
    from app.core.audit_helper import audit, log

    # Decorator on a service method
    @audit(module="task", action="create")
    def create_task(db, user, data):
        ...

    # Direct call
    log(db, user.id, "task", "create", task.id, new={"title": "..."})
"""
import functools
import inspect
from typing import Any, Callable, Optional

from sqlalchemy.orm import Session

from app.core.audit_context import get_audit_context
from app.services.enterprise_audit_service import (
    log_task_create, log_task_update, log_task_delete, log_task_assign, log_task_status_change,
    log_approval_create, log_approval_action,
    log_document_upload, log_document_delete,
    log_comment_create, log_comment_delete,
    log_auth_login, log_auth_failed, log_auth_logout,
    log_sla_start, log_sla_complete, log_sla_breach,
    log_delegation_create, log_delegation_cancel,
    log_approval_escalate, log_approval_escalation_resolve, log_approval_escalation_cancel,
)
from app.core.log import get_logger

logger = get_logger("audit_helper")

_MODULE_MAP = {
    "task": {
        "create": log_task_create,
        "update": log_task_update,
        "delete": log_task_delete,
        "assign": log_task_assign,
        "status_change": log_task_status_change,
    },
    "approval": {
        "create": log_approval_create,
        "action": log_approval_action,
    },
    "document": {
        "upload": log_document_upload,
        "delete": log_document_delete,
    },
    "comment": {
        "create": log_comment_create,
        "delete": log_comment_delete,
    },
    "auth": {
        "login": log_auth_login,
        "logout": log_auth_logout,
        "failed": log_auth_failed,
    },
    "sla": {
        "start": log_sla_start,
        "complete": log_sla_complete,
        "breach": log_sla_breach,
    },
    "delegation": {
        "create": log_delegation_create,
        "cancel": log_delegation_cancel,
    },
    "escalation": {
        "escalate": log_approval_escalate,
        "resolve": log_approval_escalation_resolve,
        "cancel": log_approval_escalation_cancel,
    },
}


def _extract_user_id(*args, **kwargs) -> Optional[int]:
    for v in list(args) + list(kwargs.values()):
        if isinstance(v, int):
            return v
        if hasattr(v, "id"):
            return v.id
        if isinstance(v, dict) and "id" in v:
            return v["id"]
    ctx = get_audit_context()
    return ctx.user_id


def _find_db(*args, **kwargs) -> Optional[Session]:
    for v in list(args) + list(kwargs.values()):
        if isinstance(v, Session):
            return v
    return None


def log(
    db: Session,
    user_id: Optional[int],
    module: str,
    action: str,
    record_id: Optional[int] = None,
    old: Optional[dict] = None,
    new: Optional[dict] = None,
) -> None:
    """
    Simplified audit log entry with automatic context enrichment.

    Args:
        db: Database session.
        user_id: ID of the acting user (None for system actions).
        module: Module name (task, approval, sla, …).
        action: Action type (create, update, delete, …).
        record_id: Primary key of the affected record.
        old: Previous state (for updates / deletes).
        new: New state (for creates / updates).
    """
    handler_map = _MODULE_MAP.get(module, {})
    handler = handler_map.get(action)
    if handler:
        handler(db, user_id, record_id)


def audit(module: str, action: str):
    """
    Decorator that auto-logs an audit entry after the wrapped
    function completes.

    The decorated function must receive ``db`` (Session) and
    ``current_user`` (or a user-like object with ``.id``) as
    keyword arguments, either directly or via ``**kwargs``.

    Examples:
        @audit(module="task", action="create")
        def create_task(db: Session, current_user: User, payload: dict) -> Task:
            ...
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)

            try:
                bound = inspect.signature(func).bind(*args, **kwargs).arguments
            except (TypeError, ValueError):
                return result

            db = _find_db(*bound.values())
            user_id = _extract_user_id(*bound.values())

            if db is None:
                return result

            record_id = None
            if hasattr(result, "id"):
                record_id = result.id

            handler_map = _MODULE_MAP.get(module, {})
            handler = handler_map.get(action)
            if handler:
                try:
                    handler(db, user_id, record_id)
                except Exception as exc:
                    logger.warning("audit helper: %s:%s handler failed: %s", module, action, exc)

            return result
        return wrapper
    return decorator
