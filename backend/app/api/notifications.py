from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.notification import NotificationOut, UnreadCount
from app.api.deps import get_db, get_current_user
from app.services.notification_service import (
    get_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
    delete_notification,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationOut])
def list_notifications_endpoint(
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return get_notifications(db, user, unread_only, skip, limit)


@router.get("/unread-count", response_model=UnreadCount)
def unread_count_endpoint(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return get_unread_count(db, user)


@router.patch("/{notification_id}/read")
def mark_read_endpoint(
    notification_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return mark_as_read(db, notification_id, user)


@router.patch("/read-all")
def mark_all_read_endpoint(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return mark_all_as_read(db, user)


@router.delete("/{notification_id}")
def delete_notification_endpoint(
    notification_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return delete_notification(db, notification_id, user)
