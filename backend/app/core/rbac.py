from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.api.deps import get_current_user


class Permissions:
    task_create = "task:create"
    task_read = "task:read"
    task_update = "task:update"
    task_delete = "task:delete"
    task_assign = "task:assign"
    task_update_status = "task:update_status"

    approval_create = "approval:create"
    approval_read = "approval:read"
    approval_act = "approval:act"
    approval_read_history = "approval:read_history"

    dashboard_view = "dashboard:view"
    dashboard_ai_summary = "dashboard:ai_summary"
    dashboard_performance = "dashboard:performance"

    user_list = "user:list"
    user_read = "user:read"
    user_update = "user:update"
    user_toggle_active = "user:toggle_active"
    user_delete = "user:delete"

    document_upload = "document:upload"
    document_read = "document:read"
    document_delete = "document:delete"

    audit_view = "audit:view"

    comment_create = "comment:create"
    comment_read = "comment:read"
    comment_delete = "comment:delete"

    notification_read = "notification:read"
    notification_manage = "notification:manage"

    ai_use = "ai:use"

    leave_create = "leave:create"
    leave_read = "leave:read"
    leave_update = "leave:update"


ROLE_PERMISSIONS = {
    "admin": {
        Permissions.task_create,
        Permissions.task_read,
        Permissions.task_update,
        Permissions.task_delete,
        Permissions.task_assign,
        Permissions.task_update_status,
        Permissions.approval_create,
        Permissions.approval_read,
        Permissions.approval_act,
        Permissions.approval_read_history,
        Permissions.dashboard_view,
        Permissions.dashboard_ai_summary,
        Permissions.dashboard_performance,
        Permissions.user_list,
        Permissions.user_read,
        Permissions.user_update,
        Permissions.user_toggle_active,
        Permissions.user_delete,
        Permissions.document_upload,
        Permissions.document_read,
        Permissions.document_delete,
        Permissions.audit_view,
        Permissions.comment_create,
        Permissions.comment_read,
        Permissions.comment_delete,
        Permissions.notification_read,
        Permissions.notification_manage,
        Permissions.ai_use,
        Permissions.leave_create,
        Permissions.leave_read,
        Permissions.leave_update,
    },
    "manager": {
        Permissions.task_create,
        Permissions.task_read,
        Permissions.task_update,
        Permissions.task_assign,
        Permissions.task_update_status,
        Permissions.approval_create,
        Permissions.approval_read,
        Permissions.approval_act,
        Permissions.approval_read_history,
        Permissions.dashboard_view,
        Permissions.dashboard_ai_summary,
        Permissions.dashboard_performance,
        Permissions.user_list,
        Permissions.user_read,
        Permissions.document_upload,
        Permissions.document_read,
        Permissions.document_delete,
        Permissions.comment_create,
        Permissions.comment_read,
        Permissions.comment_delete,
        Permissions.notification_read,
        Permissions.notification_manage,
        Permissions.ai_use,
        Permissions.leave_create,
        Permissions.leave_read,
        Permissions.leave_update,
    },
    "employee": {
        Permissions.task_read,
        Permissions.task_update_status,
        Permissions.dashboard_view,
        Permissions.document_upload,
        Permissions.document_read,
        Permissions.comment_create,
        Permissions.comment_read,
        Permissions.notification_read,
        Permissions.ai_use,
        Permissions.leave_create,
        Permissions.leave_read,
    },
}


def has_permission(user: User, permission: str) -> bool:
    role = user.role.value if hasattr(user.role, "value") else user.role
    return permission in ROLE_PERMISSIONS.get(role, set())


def require_permission(permission: str):
    def permission_checker(user: User = Depends(get_current_user)):
        if not has_permission(user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}",
            )
        return user

    return permission_checker


def require_role(allowed_roles: list):
    def role_checker(user: User = Depends(get_current_user)):
        role = user.role.value if hasattr(user.role, "value") else user.role
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return user

    return role_checker


def require_any_permission(*permissions: str):
    def permission_checker(user: User = Depends(get_current_user)):
        role = user.role.value if hasattr(user.role, "value") else user.role
        user_perms = ROLE_PERMISSIONS.get(role, set())
        if not any(p in user_perms for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return user

    return permission_checker
