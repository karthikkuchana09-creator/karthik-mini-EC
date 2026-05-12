from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.schemas.audit_log import AuditLogPaginated
from app.api.deps import get_db, require_roles
from app.services.audit_log_service import get_audit_logs

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("/", response_model=AuditLogPaginated)
def list_audit_logs_endpoint(
    user_id: Optional[int] = Query(None),
    entity: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin"])),
):
    return get_audit_logs(db, user, user_id, entity, entity_id, page, page_size)
