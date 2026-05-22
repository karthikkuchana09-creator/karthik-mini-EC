from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.schemas.approval import ApprovalCreate, ApprovalAction, ApprovalOut
from app.api.deps import get_db, rate_limit
from app.core.rbac import require_permission, Permissions
from app.core.subscription_access import require_feature
from app.core.config import settings
from app.repository.approval_repository import list_all_approvals
from app.services.approval_service import (
    create_approval,
    take_approval_action,
    get_approval_history
)

router = APIRouter(prefix="/approvals")


@router.post("")
def create_approval_endpoint(
    data: ApprovalCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_create)),
    _=Depends(require_feature("approvals")),
    __=Depends(rate_limit(settings.RATE_LIMIT_DEFAULT, settings.RATE_LIMIT_DEFAULT_WINDOW, "approvals")),
):
    return create_approval(db, data, user)


@router.get("", response_model=Page[ApprovalOut])
def get_approvals_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.approval_read)),
    _=Depends(rate_limit(settings.RATE_LIMIT_DEFAULT, settings.RATE_LIMIT_DEFAULT_WINDOW, "approvals")),
):
    return list_all_approvals(db)


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
