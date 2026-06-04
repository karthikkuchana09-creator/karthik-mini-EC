from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.repository.tenant_repository import list_all_tenants
from app.services.tenant_service import (
    create_tenant,
    get_tenant,
    update_tenant,
    activate_tenant,
    suspend_tenant,
)

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.post("", response_model=TenantResponse, status_code=201)
def create_tenant_endpoint(
    data: TenantCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.tenant_create)),
):
    return create_tenant(db, data)


@router.get("", response_model=Page[TenantResponse])
def list_tenants(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.tenant_list)),
):
    return list_all_tenants(db)


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant_endpoint(
    tenant_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.tenant_read)),
):
    return get_tenant(db, tenant_id)


@router.put("/{tenant_id}", response_model=TenantResponse)
def update_tenant_endpoint(
    tenant_id: int,
    data: TenantUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.tenant_update)),
):
    return update_tenant(db, tenant_id, data)


@router.patch("/{tenant_id}/activate", response_model=TenantResponse)
def activate_tenant_endpoint(
    tenant_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.tenant_activate)),
):
    return activate_tenant(db, tenant_id)


@router.patch("/{tenant_id}/suspend", response_model=TenantResponse)
def suspend_tenant_endpoint(
    tenant_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.tenant_suspend)),
):
    return suspend_tenant(db, tenant_id)
