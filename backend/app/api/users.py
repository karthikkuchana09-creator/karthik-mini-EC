from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.user import UserUpdate
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.user_service import get_all_users, get_user_by_id, update_user, toggle_user_active, delete_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/")
def get_users(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.user_list)),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc"),
    search: Optional[str] = Query(None),
):
    return get_all_users(db, page=page, size=size, sort_by=sort_by, sort_order=sort_order, search=search)


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.user_read))
):
    return get_user_by_id(db, user_id)


@router.put("/{user_id}")
def update_user_endpoint(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.user_update))
):
    return update_user(db, user_id, data)


@router.patch("/{user_id}/toggle-active")
def toggle_active_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.user_toggle_active))
):
    return toggle_user_active(db, user_id)


@router.delete("/{user_id}")
def delete_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.user_delete))
):
    return delete_user(db, user_id)
