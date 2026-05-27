from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from fastapi_pagination import Page

from app.schemas.approval_delegation import (
    ApprovalDelegationCreate,
    ApprovalDelegationCancel,
    ApprovalDelegationResponse,
    ApprovalDelegationFilter,
)
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.approval_delegation_service import (
    create_delegation,
    list_delegations_filtered,
    cancel_delegation,
)

router = APIRouter(prefix="/approval-delegations", tags=["Approval Delegations"])


@router.post("", response_model=ApprovalDelegationResponse)
def create_delegation_endpoint(
    data: ApprovalDelegationCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_delegation_create)),
):
    return create_delegation(db, data, user)


@router.get("/me", response_model=Page[ApprovalDelegationResponse])
def list_my_delegations_endpoint(
    delegator_id: Optional[int] = Query(None),
    delegatee_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    q: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_delegation_read)),
):
    filters = ApprovalDelegationFilter(
        delegator_id=delegator_id, delegatee_id=delegatee_id, is_active=is_active,
        q=q, sort_by=sort_by, sort_order=sort_order, page=page, size=size,
    )
    return list_delegations_filtered(db, filters, user_id=user.id)


@router.get("/active", response_model=Page[ApprovalDelegationResponse])
def list_active_delegations_endpoint(
    q: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_delegation_read)),
):
    filters = ApprovalDelegationFilter(
        is_active=True, q=q, sort_by=sort_by,
        sort_order=sort_order, page=page, size=size,
    )
    return list_delegations_filtered(db, filters)


@router.put("/{delegation_id}/cancel", response_model=ApprovalDelegationResponse)
def cancel_delegation_endpoint(
    delegation_id: int,
    body: ApprovalDelegationCancel = ApprovalDelegationCancel(),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_delegation_update)),
):
    return cancel_delegation(db, delegation_id, body, user)
