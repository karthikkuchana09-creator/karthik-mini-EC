from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_roles
from app.schemas.user import UserUpdate
from app.services.user_service import get_all_users, get_user_by_id, update_user, toggle_user_active, delete_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/")
def get_users(
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager"]))
):
    return get_all_users(db)


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return get_user_by_id(db, user_id)


@router.put("/{user_id}")
def update_user_endpoint(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin"]))
):
    return update_user(db, user_id, data)


@router.patch("/{user_id}/toggle-active")
def toggle_active_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin"]))
):
    return toggle_user_active(db, user_id)


@router.delete("/{user_id}")
def delete_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin"]))
):
    return delete_user(db, user_id)
