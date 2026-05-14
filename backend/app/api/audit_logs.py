from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.audit_log_service import get_audit_logs

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("/")
def list_audit_logs_endpoint(
    user_id: Optional[int] = Query(None),
    entity: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=500),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.audit_view)),
):
    return get_audit_logs(db, user, user_id, entity, entity_id, page, size, sort_by=sort_by, sort_order=sort_order)
