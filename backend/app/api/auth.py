from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, LoginSchema
from app.api.deps import get_db, get_current_user
from app.services.auth_service import register_user, login_user, get_current_user_info

router = APIRouter(prefix="/auth")

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    return register_user(db, user)

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    return login_user(db, data)

@router.get("/me")
def get_me(user=Depends(get_current_user)):
    return get_current_user_info(user) 