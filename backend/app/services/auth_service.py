from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password, verify_password, create_access_token
from app.core.log import get_logger

logger = get_logger("auth_service")


def register_user(db: Session, user_data: UserCreate):
    logger.info("Attempting registration: email=%s role=%s", user_data.email, user_data.role)

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        logger.warning("Registration failed: email already registered email=%s", user_data.email)
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("User registered successfully id=%d email=%s role=%s", new_user.id, new_user.email, new_user.role)
    return {
        "id": new_user.id,
        "email": new_user.email,
        "role": new_user.role
    }


def login_user(db: Session, email: str, password: str):
    logger.info("Login attempt: email=%s", email)

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.hashed_password):
        logger.warning("Login failed: invalid credentials email=%s", email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "user_id": user.id,
        "role": user.role.value if hasattr(user.role, "value") else user.role
    })

    logger.info("Login success: user_id=%d email=%s role=%s", user.id, user.email, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else user.role
        }
    }


def get_current_user_info(user):
    logger.debug("Current user info requested: user_id=%d", user.id)
    return user
