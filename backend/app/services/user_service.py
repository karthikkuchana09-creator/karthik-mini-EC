from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.user import User, SubscriptionRole
from app.schemas.user import UserUpdate
from app.core.log import get_logger
from app.utils.pagination import paginate_query
from app.core.tenant import tenant_filter, get_current_tenant_id
from fastapi.encoders import jsonable_encoder
from fastapi import Request
from app.services.audit_log_service import log_action

logger = get_logger("user_service")


def get_all_users(
    db: Session,
    page: int = 1,
    size: int = 20,
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    search: Optional[str] = None,
    request: Optional[Request] = None,
    tenant_id: Optional[int] = None,
):
    logger.debug("Fetching all users")
    query = db.query(User)

    if tenant_id is not None:
        query = tenant_filter(query, User, tenant_id)
    elif request is not None:
        tid = get_current_tenant_id(request)
        if tid:
            query = tenant_filter(query, User, tid)

    result = paginate_query(
        db, query,
        page=page, size=size,
        sort_by=sort_by, sort_order=sort_order,
        search=search, search_columns=[User.name, User.email],
    )
    result["items"] = [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "subscription_role": u.subscription_role.value if hasattr(u.subscription_role, "value") else u.subscription_role,
            "tenant_id": u.tenant_id,
            "is_active": u.is_active,
        }
        for u in result["items"]
    ]
    logger.debug("Fetched %d users", len(result["items"]))
    return result


def get_user_by_id(db: Session, user_id: int):
    logger.debug("Fetching user id=%d", user_id)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return jsonable_encoder(user)


def update_user(db: Session, user_id: int, data: UserUpdate):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(User).filter(User.email == data.email, User.id != user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    old_role = user.role.value if hasattr(user.role, "value") else user.role
    old_active = user.is_active

    user.name = data.name
    user.email = data.email
    user.role = data.role
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)

    new_role = user.role.value if hasattr(user.role, "value") else user.role
    if old_role != new_role or old_active != user.is_active:
        log_action(
            db, user_id, "role_update", "user", user_id,
            old_value={"role": old_role, "is_active": old_active},
            new_value={"role": new_role, "is_active": user.is_active},
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": new_role,
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


def set_subscription_role(db: Session, user_id: int, role: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        user.subscription_role = SubscriptionRole(role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid subscription role: {role}")
    db.commit()
    db.refresh(user)
    return user
