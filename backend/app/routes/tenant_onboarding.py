from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.tenant_onboarding import (
    TenantOnboardRequest,
    TenantAdminCreateRequest,
    TenantOnboardingStatusResponse,
    TenantOnboardResponse,
)
from app.schemas.user import UserOut
from app.routes.deps import get_db
from app.services.tenant_onboarding_service import (
    onboard_tenant,
    create_first_admin,
    get_onboarding_status,
)

router = APIRouter(prefix="/tenants", tags=["Tenant Onboarding"])


@router.post("/onboard", response_model=TenantOnboardResponse, status_code=201)
def onboard_tenant_endpoint(
    data: TenantOnboardRequest,
    db: Session = Depends(get_db),
):
    return onboard_tenant(db, data)


@router.post("/{tenant_id}/admin", response_model=UserOut, status_code=201)
def create_first_admin_endpoint(
    tenant_id: int,
    data: TenantAdminCreateRequest,
    db: Session = Depends(get_db),
):
    return create_first_admin(db, tenant_id, data)


@router.get("/{tenant_id}/onboarding-status", response_model=TenantOnboardingStatusResponse)
def get_onboarding_status_endpoint(
    tenant_id: int,
    db: Session = Depends(get_db),
):
    return get_onboarding_status(db, tenant_id)
