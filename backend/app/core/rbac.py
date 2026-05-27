from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.routes.deps import get_current_user


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

    organization_read = "organization:read"
    organization_update = "organization:update"
    organization_delete = "organization:delete"
    organization_manage_members = "organization:manage_members"
    organization_manage_invitations = "organization:manage_invitations"

    subscription_read = "subscription:read"
    subscription_upgrade = "subscription:upgrade"
    subscription_cancel = "subscription:cancel"
    subscription_manage_plans = "subscription:manage_plans"

    billing_read = "billing:read"
    billing_manage = "billing:manage"
    billing_analytics = "billing:analytics"

    credit_read = "credit:read"
    credit_manage = "credit:manage"
    credit_purchase = "credit:purchase"

    payment_read = "payment:read"
    payment_create = "payment:create"
    payment_verify = "payment:verify"

    monitoring_read = "monitoring:read"
    monitoring_manage = "monitoring:manage"
    monitoring_scheduler = "monitoring:scheduler"

    sla_rule_create = "sla_rule:create"
    sla_rule_read = "sla_rule:read"
    sla_rule_update = "sla_rule:update"
    sla_rule_delete = "sla_rule:delete"

    sla_tracking_create = "sla_tracking:create"
    sla_tracking_read = "sla_tracking:read"
    sla_tracking_update = "sla_tracking:update"

    approval_escalation_create = "approval_escalation:create"
    approval_escalation_read = "approval_escalation:read"
    approval_escalation_update = "approval_escalation:update"

    approval_delegation_create = "approval_delegation:create"
    approval_delegation_read = "approval_delegation:read"
    approval_delegation_update = "approval_delegation:update"

    notification_preference_manage = "notification_preference:manage"

    super_admin_all = "super_admin:*"


ALL_PERMISSIONS = {
    getattr(Permissions, attr)
    for attr in dir(Permissions)
    if not attr.startswith("_")
}

ROLE_PERMISSIONS = {
    "super_admin": ALL_PERMISSIONS,
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
        Permissions.organization_read,
        Permissions.organization_update,
        Permissions.organization_manage_members,
        Permissions.organization_manage_invitations,
        Permissions.subscription_read,
        Permissions.subscription_upgrade,
        Permissions.subscription_cancel,
        Permissions.billing_read,
        Permissions.billing_analytics,
        Permissions.credit_read,
        Permissions.credit_purchase,
        Permissions.payment_read,
        Permissions.payment_create,
        Permissions.payment_verify,
        Permissions.monitoring_read,

        Permissions.sla_rule_create,
        Permissions.sla_rule_read,
        Permissions.sla_rule_update,
        Permissions.sla_rule_delete,

        Permissions.sla_tracking_create,
        Permissions.sla_tracking_read,
        Permissions.sla_tracking_update,

        Permissions.approval_escalation_create,
        Permissions.approval_escalation_read,
        Permissions.approval_escalation_update,

        Permissions.approval_delegation_create,
        Permissions.approval_delegation_read,
        Permissions.approval_delegation_update,

        Permissions.notification_preference_manage,
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

        Permissions.sla_tracking_create,
        Permissions.sla_tracking_read,
        Permissions.sla_tracking_update,

        Permissions.approval_escalation_create,
        Permissions.approval_escalation_read,
        Permissions.approval_escalation_update,

        Permissions.approval_delegation_create,
        Permissions.approval_delegation_read,
        Permissions.approval_delegation_update,

        Permissions.notification_preference_manage,
    },
    "employee": {
        Permissions.task_create,
        Permissions.task_read,
        Permissions.task_update_status,
        Permissions.approval_read,
        Permissions.approval_read_history,
        Permissions.dashboard_view,
        Permissions.document_upload,
        Permissions.document_read,
        Permissions.comment_create,
        Permissions.comment_read,
        Permissions.notification_read,
        Permissions.ai_use,
        Permissions.leave_create,
        Permissions.leave_read,

        Permissions.sla_tracking_read,
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
