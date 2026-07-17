from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import Optional
from fastapi_pagination import Page

from app.schemas.platform.notification_rule import (
    NotificationRuleCreate, NotificationRuleUpdate, NotificationRuleOut,
)
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.platform.notification_rule_service import (
    create_rule, get_rule, list_rules, update_rule, delete_rule,
)

router = APIRouter(prefix="/notification-rules", tags=["Notification Rules"])


@router.post(
    "",
    response_model=NotificationRuleOut,
    summary="Create notification rule",
    description="Create a reusable notification rule that defines when and how notifications are sent. "
                "Supported event types: task_assignment, task_status, approval_request, approval_action, "
                "meeting_reminder, escalation_alert, mention_alert, document_update, comment, system_alert, sla_breach. "
                "Supported channels: in_app, email, both.",
    responses={
        201: {"description": "Rule created"},
        400: {"description": "Invalid event_type or channel"},
        403: {"description": "Permission denied"},
    },
)
def create_rule_endpoint(
    data: NotificationRuleCreate = Body(..., description="Rule creation payload"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_manage)),
):
    return create_rule(db, data, user, tenant_id=user.tenant_id)


@router.get(
    "",
    response_model=Page[NotificationRuleOut],
    summary="List notification rules",
    description="Retrieve all notification rules for the current tenant. Optionally filter by event_type.",
)
def list_rules_endpoint(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_read)),
):
    return list_rules(db, tenant_id=user.tenant_id, event_type=event_type, page=page, size=size)


@router.get(
    "/{rule_id}",
    response_model=NotificationRuleOut,
    summary="Get notification rule",
    description="Retrieve a single notification rule by ID.",
)
def get_rule_endpoint(
    rule_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_read)),
):
    return get_rule(db, rule_id, tenant_id=user.tenant_id)


@router.put(
    "/{rule_id}",
    response_model=NotificationRuleOut,
    summary="Update notification rule",
    description="Update an existing notification rule's configuration.",
)
def update_rule_endpoint(
    rule_id: int,
    data: NotificationRuleUpdate = Body(..., description="Rule update payload"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_manage)),
):
    return update_rule(db, rule_id, data, user, tenant_id=user.tenant_id)


@router.delete(
    "/{rule_id}",
    summary="Soft-delete notification rule",
    description="Soft-delete a notification rule. It remains in the database but is excluded from all queries.",
)
def delete_rule_endpoint(
    rule_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_manage)),
):
    return delete_rule(db, rule_id, user, tenant_id=user.tenant_id)
