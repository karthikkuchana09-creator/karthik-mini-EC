from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.approval import ApprovalCreate, ApprovalAction
from app.api.deps import get_db, rate_limit
from app.core.rbac import require_permission, Permissions
from app.core.config import settings
from app.services.approval_service import (
    create_approval,
    get_approvals,
    take_approval_action,
    get_approval_history
)

router = APIRouter(prefix="/approvals")


@router.post("/")
def create_approval_endpoint(
    data: ApprovalCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_create)),
    _=Depends(rate_limit(settings.RATE_LIMIT_DEFAULT, settings.RATE_LIMIT_DEFAULT_WINDOW, "approvals")),
):
    return create_approval(db, data, user)


@router.get("/")
def get_approvals_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_read)),
    _=Depends(rate_limit(settings.RATE_LIMIT_DEFAULT, settings.RATE_LIMIT_DEFAULT_WINDOW, "approvals")),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc"),
    search: Optional[str] = Query(None),
):
    return get_approvals(db, user, page=page, size=size, sort_by=sort_by, sort_order=sort_order, search=search)


@router.patch("/{approval_id}/action")
def take_action_endpoint(
    approval_id: int,
    data: ApprovalAction,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_act)),
    _=Depends(rate_limit(settings.RATE_LIMIT_DEFAULT, settings.RATE_LIMIT_DEFAULT_WINDOW, "approvals")),
):
    return take_approval_action(db, approval_id, data, user)


@router.get("/{approval_id}/history")
def get_history_endpoint(
    approval_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_read_history)),
    _=Depends(rate_limit(settings.RATE_LIMIT_DEFAULT, settings.RATE_LIMIT_DEFAULT_WINDOW, "approvals")),
):
    return get_approval_history(db, approval_id)
