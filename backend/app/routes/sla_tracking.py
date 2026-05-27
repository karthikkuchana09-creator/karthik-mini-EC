from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from fastapi_pagination import Page

from app.schemas.sla_tracking import SLATrackingResponse, SLATrackingComplete, SLATrackingFilter
from app.routes.deps import get_db, get_current_user
from app.core.rbac import require_permission, Permissions
from app.services.sla_tracking_service import (
    start_sla_tracking,
    complete_sla_tracking,
    get_active_slas,
    get_breached_slas,
    get_sla_by_record,
)

router = APIRouter(prefix="/sla-tracking", tags=["SLA Tracking"])


@router.post("/tasks/{task_id}", response_model=SLATrackingResponse)
def start_task_sla_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_tracking_create)),
):
    return start_sla_tracking(db, "task", task_id)


@router.post("/approvals/{approval_id}", response_model=SLATrackingResponse)
def start_approval_sla_endpoint(
    approval_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_tracking_create)),
):
    return start_sla_tracking(db, "approval", approval_id)


@router.put("/{tracking_id}/complete", response_model=SLATrackingResponse)
def complete_sla_endpoint(
    tracking_id: int,
    body: SLATrackingComplete = SLATrackingComplete(),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_tracking_update)),
):
    return complete_sla_tracking(db, tracking_id, body)


@router.get("/active", response_model=Page[SLATrackingResponse])
def list_active_slas(
    module_name: Optional[str] = Query(None),
    sla_rule_id: Optional[int] = Query(None),
    record_id: Optional[int] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    q: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_tracking_read)),
):
    filters = SLATrackingFilter(
        module_name=module_name, sla_rule_id=sla_rule_id, record_id=record_id,
        from_date=from_date, to_date=to_date, q=q,
        sort_by=sort_by, sort_order=sort_order, page=page, size=size,
    )
    return get_active_slas(db, filters)


@router.get("/breached", response_model=Page[SLATrackingResponse])
def list_breached_slas(
    module_name: Optional[str] = Query(None),
    sla_rule_id: Optional[int] = Query(None),
    record_id: Optional[int] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    q: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_tracking_read)),
):
    filters = SLATrackingFilter(
        module_name=module_name, sla_rule_id=sla_rule_id, record_id=record_id,
        from_date=from_date, to_date=to_date, q=q,
        sort_by=sort_by, sort_order=sort_order, page=page, size=size,
    )
    return get_breached_slas(db, filters)


@router.get("/record/{module_name}/{record_id}", response_model=SLATrackingResponse)
def get_sla_by_record_endpoint(
    module_name: str,
    record_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_tracking_read)),
):
    return get_sla_by_record(db, module_name, record_id)
