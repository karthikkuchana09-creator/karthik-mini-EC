from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from typing import Optional

from app.schemas.notification import (
    NotificationOut,
    NotificationFilter,
    UnreadCount,
    NotificationStats,
    BulkReadRequest,
)
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.repository.notification_repository import list_notifications_for_user
from app.services.notification_service import (
    get_unread_count,
    get_notification_stats,
    mark_as_read,
    mark_multiple_as_read,
    mark_all_as_read,
    delete_notification,
)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=Page[NotificationOut])
def list_notifications_endpoint(
    type: Optional[str] = Query(None),
    notification_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    q: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.notification_read)),
):
    filters = NotificationFilter(
        type=type, notification_type=notification_type, priority=priority,
        is_read=is_read, q=q, sort_by=sort_by, sort_order=sort_order,
        page=page, size=size,
    )
    return list_notifications_for_user(db, user.id, filters)


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
