from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.leave import LeaveCreate, LeaveUpdate, LeaveOut
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.leave_service import create_leave, get_user_leaves, update_leave

router = APIRouter(prefix="/leaves", tags=["Leaves"])


@router.post("/", response_model=LeaveOut)
def create_leave_endpoint(
    data: LeaveCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.leave_create)),
):
    return create_leave(db, user, data)


@router.get("/", response_model=list[LeaveOut])
def list_leaves_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.leave_read)),
):
    return get_user_leaves(db, user)


@router.put("/{leave_id}", response_model=LeaveOut)
def update_leave_endpoint(
    leave_id: int,
    data: LeaveUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.leave_update)),
):
    return update_leave(db, leave_id, user, data)
