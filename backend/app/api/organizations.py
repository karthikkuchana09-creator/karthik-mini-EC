from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.tenant import require_tenant, tenant_filter
from app.models.user import User
from app.models.organization import Organization
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    OrganizationSettingsUpdate, OrganizationSettingsResponse,
    InviteCreate, InviteResponse, TenantRegisterResponse,
)
from app.services import organization_service as svc

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.get("/", response_model=list[OrganizationResponse])
def list_organizations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tenant_id = user.tenant_id
    query = db.query(Organization)
    query = tenant_filter(query, Organization, tenant_id)
    return query.all()

@router.post("/register", response_model=TenantRegisterResponse)
def register_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
):
    org = svc.create_organization(db, data)
    return TenantRegisterResponse(organization=org)

@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org = svc.get_organization(db, org_id)
    if not org:
        from fastapi import HTTPException, status as st
        raise HTTPException(st.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org

@router.patch("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: int,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return svc.update_organization(db, org_id, data.model_dump(exclude_unset=True))

@router.get("/{org_id}/settings", response_model=OrganizationSettingsResponse)
def get_org_settings(
    org_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    settings = svc.get_org_settings(db, org_id)
    if not settings:
        from fastapi import HTTPException, status as st
        raise HTTPException(st.HTTP_404_NOT_FOUND, detail="Settings not found")
    return settings

@router.patch("/{org_id}/settings", response_model=OrganizationSettingsResponse)
def update_org_settings(
    org_id: int,
    data: OrganizationSettingsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return svc.update_org_settings(db, org_id, data)

@router.post("/{org_id}/invites", response_model=InviteResponse)
def invite_user(
    org_id: int,
    data: InviteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return svc.create_invitation(db, org_id, data.email, data.role, user.id)
