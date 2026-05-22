from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from fastapi_pagination import Page
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.core.subscription_access import require_feature
from app.schemas.audit_log import AuditLogOut
from app.repository.audit_log_repository import (
    list_all_audit_logs,
    list_audit_logs_by_entity,
    list_audit_logs_by_user,
)
from app.services.audit_log_service import (
    get_audit_log_detail,
    get_audit_stats,
    export_audit_logs,
)

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=Page[AuditLogOut])
def list_audit_logs_endpoint(
    _=Depends(require_feature("audit_trail")),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.audit_view)),
):
    return list_all_audit_logs(db)


@router.get("/export")
def export_audit_logs_endpoint(
    fmt: str = Query("csv", pattern="^(csv|json)$"),
    user_id: Optional[int] = Query(None),
    entity: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(10000, ge=1, le=100000),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.audit_view)),
):
    result = export_audit_logs(
        db, user,
        fmt=fmt,
        user_id=user_id,
        entity=entity,
        entity_id=entity_id,
        action=action,
        date_from=date_from,
        date_to=date_to,
        search=search,
        limit=limit,
    )
    return Response(
        content=result["content"],
        media_type=result["media_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{result["filename"]}"',
            "X-Total-Records": str(result["total_records"]),
        },
    )


@router.get("/stats")
def audit_stats_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.audit_view)),
):
    return get_audit_stats(db, user)


@router.get("/{log_id}")
def audit_log_detail_endpoint(
    log_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.audit_view)),
):
    log = get_audit_log_detail(db, log_id)
    if not log:
        raise HTTPException(404, "Audit log not found")
    return log


@router.get("/entity/{entity}/{entity_id}", response_model=Page[AuditLogOut])
def audit_logs_by_entity_endpoint(
    entity: str,
    entity_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.audit_view)),
):
    return list_audit_logs_by_entity(db, entity, entity_id)


@router.get("/user/{user_id}", response_model=Page[AuditLogOut])
def audit_logs_by_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.audit_view)),
):
    return list_audit_logs_by_user(db, user_id)
