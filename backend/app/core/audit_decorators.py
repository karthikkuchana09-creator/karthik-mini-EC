"""
Reusable decorators for enterprise audit logging.

Provides:
    @audit_log(...)  — log a structured audit entry before/after a function call.
    @track_changes   — capture old and new state of an SQLAlchemy model instance.
"""
import functools
import inspect
from typing import Optional, Callable, Any

from sqlalchemy.orm import Session

from app.services.enterprise_audit_service import (
    log_task_create, log_task_update, log_task_delete,
    log_approval_create, log_approval_action,
    log_document_upload, log_document_delete,
    log_comment_create, log_comment_delete,
    log_auth_login, log_auth_failed,
    log_sla_start, log_sla_complete, log_sla_breach,
    log_delegation_create,
)
from app.core.audit_context import get_audit_context
from app.core.log import get_logger

logger = get_logger("audit_decorators")

_MODULE_MAP = {
    "task": {
        "create": log_task_create,
        "update": log_task_update,
        "delete": log_task_delete,
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
        "failed": log_auth_failed,
    },
    "sla": {
        "start": log_sla_start,
        "complete": log_sla_complete,
        "breach": log_sla_breach,
    },
    "delegation": {
        "create": log_delegation_create,
    },
}


def audit_log(
    module: str,
    action: str,
    entity_param: Optional[str] = None,
    record_id_param: Optional[str] = None,
    extract: Optional[Callable] = None,
):
    """
    Decorator that logs an audit entry after the wrapped function completes.

    Args:
        module: module name (task, approval, document, …)
        action: action type (create, update, delete, …)
        entity_param: name of the function argument that holds the entity name
        record_id_param: name of the function argument that holds the record ID
        extract: optional callable fn(result) -> dict of data to log
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)

            try:
                call_args = inspect.signature(func).bind(*args, **kwargs).arguments
            except (TypeError, ValueError):
                logger.warning("audit_log: cannot inspect call args for %s", func.__name__)
                return result

            db = _find_db(call_args)
            if not db:
                logger.warning("audit_log: no Session found for %s", func.__name__)
                return result

            user_id = _find_user_id(call_args)
            entity = _resolve(call_args, entity_param) if entity_param else module
            record_id = _resolve(call_args, record_id_param)

            log_fn = _MODULE_MAP.get(module, {}).get(action)
            if not log_fn:
                logger.warning("audit_log: no handler for %s:%s", module, action)
                return result

            audit_kwargs = {"db": db, "user_id": user_id}

            if module == "task" and action == "create":
                log_fn(db, user_id, record_id, {"id": record_id, **(_extract_from_result(result, extract) or {})})
            elif module == "approval" and action == "create":
                data = _extract_from_result(result, extract) or {}
                log_fn(db, user_id, record_id, data)
            elif module == "document" and action == "upload":
                filename = _resolve(call_args, "filename") or getattr(result, "filename", "unknown")
                task_id = _resolve(call_args, "task_id")
                log_fn(db, user_id, record_id, filename, task_id)
            elif module == "comment" and action == "create":
                log_fn(db, user_id, record_id, _resolve(call_args, "task_id"), _resolve(call_args, "is_internal", False))
            elif module == "auth" and action == "login":
                email = _resolve(call_args, "email") or "unknown"
                log_fn(db, user_id, email)
            else:
                log_fn(db, user_id, record_id)

            return result

        return wrapper

    return decorator


def track_changes(module: str):
    """
    Decorator that captures old/new state of an SQLAlchemy model.
    The decorated function must accept a ``db`` keyword and a model ``instance``.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            call_args = inspect.signature(func).bind(*args, **kwargs).arguments

            instance = call_args.get("instance")
            old = _snapshot(instance) if instance else None

            result = func(*args, **kwargs)

            new = _snapshot(instance) if instance else None

            db = _find_db(call_args)
            if db and instance and old is not None and new is not None:
                user_id = _find_user_id(call_args)
                log_task_update(db, user_id, instance.id, old, new)

            return result
        return wrapper
    return decorator


# ── Helpers ─────────────────────────────────────────────────────────

def _find_db(call_args: dict) -> Optional[Session]:
    for v in call_args.values():
        if isinstance(v, Session):
            return v
    return None


def _find_user_id(call_args: dict) -> int:
    for v in call_args.values():
        if hasattr(v, "id"):
            return v.id
        if isinstance(v, dict) and "id" in v:
            return v["id"]
    ctx = get_audit_context()
    return ctx.user_id or 0


def _resolve(call_args: dict, name: str, default: Any = None) -> Any:
    v = call_args.get(name, default)
    if v is None and default is not None:
        return default
    return v


def _extract_from_result(result, extract: Optional[Callable]) -> Optional[dict]:
    if extract and result:
        return extract(result)
    return None


def _snapshot(instance) -> Optional[dict]:
    if instance is None:
        return None
    try:
        table = instance.__table__
        return {c.name: getattr(instance, c.name) for c in table.columns}
    except Exception:
        return None
