from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/users", tags=["Users"])

# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ✅ GET ALL USERS (admin only)
@router.get("/")
def get_users(
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin"]))
):
    return db.query(User).all()


# ✅ GET USER BY ID
@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    found_user = db.query(User).filter(User.id == user_id).first()

    if not found_user:
        raise HTTPException(status_code=404, detail="User not found")

    return found_user