from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.notification import (
    NotificationOut,
    NotificationList,
    UnreadCount,
    NotificationStats,
    BulkReadRequest,
    NotificationCategory,
)
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.notification_service import (
    get_notifications,
    get_unread_count,
    get_notification_stats,
    mark_as_read,
    mark_multiple_as_read,
    mark_all_as_read,
    delete_notification,
)
from app.models.notification import NotificationType

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=NotificationList)
def list_notifications_endpoint(
    unread_only: bool = Query(False),
    category: NotificationType | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_read)),
):
    return get_notifications(db, user, unread_only=unread_only, category=category, page=page, size=size)


@router.get("/unread-count", response_model=UnreadCount)
def unread_count_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_read)),
):
    return get_unread_count(db, user)


@router.get("/stats", response_model=NotificationStats)
def notification_stats_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_read)),
):
    return get_notification_stats(db, user)


@router.patch("/read")
def bulk_read_endpoint(
    body: BulkReadRequest,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_manage)),
):
    return mark_multiple_as_read(db, body.notification_ids, user)


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
