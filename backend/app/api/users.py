from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_roles
from app.services.user_service import get_all_users, get_user_by_id

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
