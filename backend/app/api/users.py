from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.schemas.user import UserUpdate, UserOut
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.core.subscription_access import require_feature
from app.repository.user_repository import list_all_users
from app.services.user_service import (
    get_user_by_id, update_user,
    toggle_user_active, delete_user,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=Page[UserOut])
def get_users(
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.user_list)),
    _=Depends(require_feature("user_management")),
):
    tenant_id = user.tenant_id if user else None
    return list_all_users(db, tenant_id=tenant_id)


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.user_read)),
):
    return get_user_by_id(db, user_id)


@router.put("/{user_id}")
def update_user_endpoint(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.user_update)),
):
    return update_user(db, user_id, data)


@router.patch("/{user_id}/toggle-active")
def toggle_active_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.user_toggle_active)),
):
    return toggle_user_active(db, user_id)


@router.delete("/{user_id}")
def delete_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.user_delete)),
):
    return delete_user(db, user_id)
