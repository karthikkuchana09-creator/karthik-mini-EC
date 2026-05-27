from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.notification_preference import (
    NotificationPreferenceUpdate,
    NotificationPreferenceResponse,
)
from app.routes.deps import get_db, get_current_user
from app.core.rbac import require_permission, Permissions
from app.services.notification_preference_service import (
    get_or_create_preferences,
    create_default_preferences,
    update_preferences,
)

router = APIRouter(prefix="/notification-preferences", tags=["Notification Preferences"])


@router.get("/me", response_model=NotificationPreferenceResponse)
def get_my_preferences(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return get_or_create_preferences(db, user.id)


@router.put("/me", response_model=NotificationPreferenceResponse)
def update_my_preferences(
    data: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return update_preferences(db, user.id, data, user)


@router.post("/default/{user_id}", response_model=NotificationPreferenceResponse)
def create_default_for_user(
    user_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_permission(Permissions.notification_preference_manage)),
):
    return create_default_preferences(db, user_id)
