"""
Enterprise access control utilities.

Provides FastAPI dependency factories for common role/permission
patterns, tenant-aware resource checks, and secure access helpers.

Usage:
    from app.core.access_control import require_admin, require_tenant_access

    @router.delete("/sla-rules/{rule_id}")
    async def delete_rule(
        _: None = Depends(require_admin),
        ...
    ):
"""
from typing import Optional, Any

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.routes.deps import get_current_user, get_db
from app.core.rbac import has_permission
from app.core.rbac import require_role as rbac_require_role
from app.core.rbac import Permissions
from app.core.exceptions import PermissionDeniedException


# ── Role shortcut dependencies ─────────────────────────────────────

def require_admin():
    """
    FastAPI dependency: user must be admin or super_admin.

    Usage:
        @router.delete("/sla-rules/{rule_id}")
        async def delete_rule(
            _: None = Depends(require_admin()),
            ...
        ):
    """
    return rbac_require_role(["admin", "super_admin"])


def require_manager_or_admin():
    """
    FastAPI dependency: user must be manager, admin, or super_admin.
    """
    return rbac_require_role(["manager", "admin", "super_admin"])


def require_employee_or_above():
    """
    FastAPI dependency: any authenticated active user.
    Sugar over ``get_current_user`` for readability.
    """
    return get_current_user


# ── Tenant-aware access ────────────────────────────────────────────

def require_tenant_access():
    """
    FastAPI dependency: ensures the current user belongs to a tenant
    and the resource tenant matches the user tenant.

    Place this AFTER ``get_current_user``.

    Usage:
        @router.get("/audit-logs")
        async def list_logs(
            user: User = Depends(get_current_user),
            _: None = Depends(require_tenant_access()),
            ...
        ):
    """
    def dependency(user: User = Depends(get_current_user)) -> None:
        if user.tenant_id is None:
            raise HTTPException(
                status_code=403,
                detail="Tenant access required",
            )
    return dependency


def own_resource(
    model_class: type,
    owner_field: str = "user_id",
    id_param: str = "id",
    allow_admin: bool = True,
):
    """
    FastAPI dependency factory: ensures the current user owns the
    resource identified by a path parameter, or is an admin.

    Usage:
        @router.put("/delegations/{delegation_id}/cancel")
        async def cancel_delegation(
            delegation_id: int,
            _: None = Depends(own_resource(
                ApprovalDelegation, owner_field="delegator_id",
            )),
            ...
        ):
    """
    async def dependency(
        *args,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        **kwargs,
    ) -> User:
        if allow_admin and (
            has_permission(user, Permissions.super_admin_all)
            or user.role in (UserRole.admin, UserRole.super_admin)
        ):
            return user

        resource_id = kwargs.get(id_param)
        if resource_id is None:
            raise HTTPException(400, f"Missing path parameter: {id_param}")

        resource = db.scalar(
            select(model_class).where(model_class.id == resource_id)
        )
        if resource is None:
            raise HTTPException(404, "Resource not found")

        owner_id: Optional[int] = getattr(resource, owner_field, None)
        if owner_id is None or owner_id != user.id:
            raise PermissionDeniedException()

        return user

    return Depends(dependency)


# ── Secure access helpers ──────────────────────────────────────────

def can_manage_escalation(user: User, escalation) -> bool:
    """
    Check if a user can manage (resolve/cancel) an escalation.
    Admin/super_admin can manage any; the escalation target can
    resolve their own.
    """
    if has_permission(user, Permissions.super_admin_all):
        return True
    role = user.role.value if hasattr(user.role, "value") else user.role
    if role in ("admin",):
        return True
    return escalation.escalated_to == user.id


def can_manage_delegation(user: User, delegation) -> bool:
    """
    Check if a user can cancel a delegation.
    Only the delegator or an admin can cancel.
    """
    if has_permission(user, Permissions.super_admin_all):
        return True
    role = user.role.value if hasattr(user.role, "value") else user.role
    if role in ("admin",):
        return True
    return delegation.delegator_id == user.id


def is_admin(user: User) -> bool:
    """Check if user has admin or super_admin role."""
    role = user.role.value if hasattr(user.role, "value") else user.role
    return role in ("admin", "super_admin")


def same_tenant(user: User, resource) -> bool:
    """Check if user and resource belong to the same tenant."""
    if not hasattr(resource, "tenant_id"):
        return True
    if user.tenant_id is None or resource.tenant_id is None:
        return True
    return user.tenant_id == resource.tenant_id
