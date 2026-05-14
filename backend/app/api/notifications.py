from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.notification import NotificationOut, UnreadCount
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.notification_service import (
    get_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
    delete_notification,
)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def list_notifications_endpoint(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_read)),
):
    return get_notifications(db, user, unread_only, page=page, size=size)


@router.get("/unread-count", response_model=UnreadCount)
def unread_count_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_read)),
):
    return get_unread_count(db, user)


@router.patch("/{notification_id}/read")
def mark_read_endpoint(
    notification_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_manage)),
):
    return mark_as_read(db, notification_id, user)


@router.patch("/read-all")
def mark_all_read_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_manage)),
):
    return mark_all_as_read(db, user)


@router.delete("/{notification_id}")
def delete_notification_endpoint(
    notification_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_manage)),
):
    return delete_notification(db, notification_id, user)
