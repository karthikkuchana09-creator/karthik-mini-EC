from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.approval import ApprovalCreate, ApprovalAction
from app.api.deps import get_db, get_current_user
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
    user=Depends(get_current_user)
):
    return create_approval(db, data, user)

@router.get("/")
def get_approvals_endpoint(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return get_approvals(db, user)

@router.patch("/{approval_id}/action")
def take_action_endpoint(
    approval_id: int,
    data: ApprovalAction,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return take_approval_action(db, approval_id, data, user)

@router.get("/{approval_id}/history")
def get_history_endpoint(
    approval_id: int,
    db: Session = Depends(get_db)
):
    return get_approval_history(db, approval_id)