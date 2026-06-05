from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.tenant_collaboration_usage import (
    TenantCollaborationUsageResponse,
    TenantCollaborationUsageRecalculateResponse,
)
from app.routes.deps import get_db
from app.services.tenant_collaboration_usage_service import (
    recalculate_usage,
    get_usage,
)

router = APIRouter(prefix="/tenants", tags=["Tenant Collaboration Usage"])


@router.get(
    "/{tenant_id}/collaboration/usage",
    response_model=TenantCollaborationUsageResponse,
)
def get_usage_endpoint(
    tenant_id: int,
    db: Session = Depends(get_db),
):
    return get_usage(db, tenant_id)


@router.post(
    "/{tenant_id}/collaboration/recalculate-usage",
    response_model=TenantCollaborationUsageRecalculateResponse,
)
def recalculate_usage_endpoint(
    tenant_id: int,
    db: Session = Depends(get_db),
):
    return recalculate_usage(db, tenant_id)
