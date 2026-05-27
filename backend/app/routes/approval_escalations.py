from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from fastapi_pagination import Page

from app.schemas.approval_escalation import (
    ApprovalEscalationCreate,
    ApprovalEscalationResolve,
    ApprovalEscalationResponse,
    ApprovalEscalationFilter,
)
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.approval_escalation_service import (
    create_escalation,
    list_escalations_filtered,
    resolve_escalation,
    cancel_escalation,
)

router = APIRouter(prefix="/approval-escalations", tags=["Approval Escalations"])


@router.post("", response_model=ApprovalEscalationResponse)
def create_escalation_endpoint(
    data: ApprovalEscalationCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_escalation_create)),
):
    return create_escalation(db, data, user)


@router.get("", response_model=Page[ApprovalEscalationResponse])
def list_escalations_endpoint(
    approval_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    escalation_level: Optional[str] = Query(None),
    escalated_from: Optional[int] = Query(None),
    escalated_to: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_escalation_read)),
):
    filters = ApprovalEscalationFilter(
        approval_id=approval_id, status=status, escalation_level=escalation_level,
        escalated_from=escalated_from, escalated_to=escalated_to, q=q,
        sort_by=sort_by, sort_order=sort_order, page=page, size=size,
    )
    return list_escalations_filtered(db, filters)


@router.put("/{escalation_id}/resolve", response_model=ApprovalEscalationResponse)
def resolve_escalation_endpoint(
    escalation_id: int,
    body: ApprovalEscalationResolve = ApprovalEscalationResolve(),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_escalation_update)),
):
    return resolve_escalation(db, escalation_id, body, current_user=user)


@router.put("/{escalation_id}/cancel", response_model=ApprovalEscalationResponse)
def cancel_escalation_endpoint(
    escalation_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_escalation_update)),
):
    return cancel_escalation(db, escalation_id, user)
