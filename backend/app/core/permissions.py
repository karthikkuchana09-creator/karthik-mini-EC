"""
Role-based permission decorators and FastAPI dependency factories.

Provides three mechanisms for enforcing permissions:

1. **Dependency factories** (inline ``Depends()``):
    >>> @router.get("/tasks")
    >>> async def list_tasks(_: None = Depends(permission("task:read"))):
    >>>     ...

2. **Decorator factories** (stacked on route handlers):
    >>> @router.get("/tasks")
    >>> @require_permission("task:read")
    >>> async def list_tasks():
    >>>     ...

3. **Pre-built permission constants** for common checks:
    >>> from app.core.permissions import Allow
    >>> @router.get("/tasks")
    >>> async def list_tasks(_: None = Depends(Allow.task_read)):
    >>>     ...
"""
import functools
from typing import Callable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.routing import APIRoute

from app.models.user import User
from app.routes.deps import get_current_user
from app.core.rbac import has_permission as _has_perm
from app.core.rbac import ROLE_PERMISSIONS
from app.core.rbac import Permissions as _Permissions
from app.core.exceptions import PermissionDeniedException


# ── Permission constants (re-exported for convenience) ────────────

class Allow:
    """Pre-built permission strings in ``Depends(Allow.xxx)`` form."""

    # Task
    task_create = Depends(lambda: _check_permission(_Permissions.task_create))
    task_read = Depends(lambda: _check_permission(_Permissions.task_read))
    task_update = Depends(lambda: _check_permission(_Permissions.task_update))
    task_delete = Depends(lambda: _check_permission(_Permissions.task_delete))
    task_assign = Depends(lambda: _check_permission(_Permissions.task_assign))
    task_update_status = Depends(lambda: _check_permission(_Permissions.task_update_status))

    # Approval
    approval_create = Depends(lambda: _check_permission(_Permissions.approval_create))
    approval_read = Depends(lambda: _check_permission(_Permissions.approval_read))
    approval_act = Depends(lambda: _check_permission(_Permissions.approval_act))

    # Dashboard
    dashboard_view = Depends(lambda: _check_permission(_Permissions.dashboard_view))

    # User
    user_list = Depends(lambda: _check_permission(_Permissions.user_list))
    user_read = Depends(lambda: _check_permission(_Permissions.user_read))
    user_update = Depends(lambda: _check_permission(_Permissions.user_update))
    user_toggle_active = Depends(lambda: _check_permission(_Permissions.user_toggle_active))

    # Document
    document_upload = Depends(lambda: _check_permission(_Permissions.document_upload))
    document_read = Depends(lambda: _check_permission(_Permissions.document_read))
    document_delete = Depends(lambda: _check_permission(_Permissions.document_delete))

    # Audit
    audit_view = Depends(lambda: _check_permission(_Permissions.audit_view))

    # Comment
    comment_create = Depends(lambda: _check_permission(_Permissions.comment_create))
    comment_read = Depends(lambda: _check_permission(_Permissions.comment_read))
    comment_delete = Depends(lambda: _check_permission(_Permissions.comment_delete))

    # Notification
    notification_read = Depends(lambda: _check_permission(_Permissions.notification_read))
    notification_manage = Depends(lambda: _check_permission(_Permissions.notification_manage))

    # AI
    ai_use = Depends(lambda: _check_permission(_Permissions.ai_use))

    # SLA
    sla_rule_create = Depends(lambda: _check_permission(_Permissions.sla_rule_create))
    sla_rule_read = Depends(lambda: _check_permission(_Permissions.sla_rule_read))
    sla_rule_update = Depends(lambda: _check_permission(_Permissions.sla_rule_update))
    sla_tracking_create = Depends(lambda: _check_permission(_Permissions.sla_tracking_create))
    sla_tracking_read = Depends(lambda: _check_permission(_Permissions.sla_tracking_read))

    # Super admin
    super_admin = Depends(lambda: _check_permission(_Permissions.super_admin_all))


# ── Internal dependency checker ────────────────────────────────────

def _check_permission(permission: str) -> Callable:
    """Return a FastAPI dependency that checks a single permission."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if not _has_perm(user, permission):
            raise PermissionDeniedException(permission)
        return user
    return checker


# ── Public API ─────────────────────────────────────────────────────

def permission(perm: str) -> Callable:
    """
    FastAPI dependency factory for a single permission.

    Usage:
        @router.get("/tasks")
        async def list_tasks(_: None = Depends(permission("task:read"))):
            ...
    """
    return _check_permission(perm)


def any_permission(*permissions: str) -> Callable:
    """
    FastAPI dependency factory that allows access if the user has
    *any* of the given permissions.

    Usage:
        @router.get("/admin")
        async def admin_panel(_: None = Depends(any_permission("admin:read", "super_admin:*"))):
            ...
    """
    def checker(user: User = Depends(get_current_user)) -> User:
        role = user.role.value if hasattr(user.role, "value") else user.role
        user_perms = ROLE_PERMISSIONS.get(role, set())
        if not any(p in user_perms for p in permissions):
            raise PermissionDeniedException()
        return user
    return checker


def require_role(allowed_roles: list[str]) -> Callable:
    """
    FastAPI dependency factory that restricts access to specific roles.

    Usage:
        @router.delete("/users/{id}")
        async def delete_user(_: None = Depends(require_role(["admin", "super_admin"]))):
            ...
    """
    def checker(user: User = Depends(get_current_user)) -> User:
        role = user.role.value if hasattr(user.role, "value") else user.role
        if role not in allowed_roles:
            raise PermissionDeniedException()
        return user
    return checker


# ── Decorator-based API ────────────────────────────────────────────

def _build_dependency_decorator(
    dependency_factory: Callable,
    *args,
    **kwargs,
):
    """
    Build a decorator that injects a ``Depends()`` into the route
    handler's signature.

    This allows decorator-style usage:
        @require_permission("task:read")
        async def handler(...):
    """
    dep = dependency_factory(*args, **kwargs)

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)

        # FastAPIRoute.process() inspects __signature__ to build dependencies.
        # By adding the dependency to the route's dependencies list we avoid
        # modifying the function signature.
        if not hasattr(wrapper, "__depends__"):
            wrapper.__depends__ = []
        wrapper.__depends__.append(dep)
        return wrapper
    return decorator


def require_permission(perm: str):
    """
    Decorator version of the permission check.

    Usage:
        @router.get("/tasks")
        @require_permission("task:read")
        async def list_tasks():
            ...
    """
    return _build_dependency_decorator(permission, perm)


def require_any_permission(*perms: str):
    """
    Decorator version of the OR-based permission check.

    Usage:
        @router.get("/admin")
        @require_any_permission("admin:read", "super_admin:*")
        async def admin_panel():
            ...
    """
    return _build_dependency_decorator(any_permission, *perms)


def require_role_decorator(roles: list[str]):
    """
    Decorator version of the role check.

    Usage:
        @router.delete("/users/{id}")
        @require_role_decorator(["admin", "super_admin"])
        async def delete_user():
            ...
    """
    return _build_dependency_decorator(require_role, roles)
