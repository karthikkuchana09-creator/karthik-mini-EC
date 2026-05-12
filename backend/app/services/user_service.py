from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserUpdate
from app.core.log import get_logger
from fastapi.encoders import jsonable_encoder

logger = get_logger("user_service")


def get_all_users(db: Session):
    logger.debug("Fetching all users")
    users = db.query(User).all()
    logger.debug("Fetched %d users", len(users))
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "is_active": u.is_active,
        }
        for u in users
    ]


def get_user_by_id(db: Session, user_id: int):
    logger.debug("Fetching user id=%d", user_id)
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        logger.warning("User not found id=%d", user_id)
        raise HTTPException(status_code=404, detail="User not found")

    return jsonable_encoder(user)


def update_user(db: Session, user_id: int, data: UserUpdate):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(User).filter(User.email == data.email, User.id != user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    user.name = data.name
    user.email = data.email
    user.role = data.role
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "is_active": user.is_active,
    }


def toggle_user_active(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


def delete_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
