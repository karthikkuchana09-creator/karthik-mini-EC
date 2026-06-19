from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from app.routes.deps import get_db
from app.core.tenant import get_current_tenant_table_id, get_current_tenant_id
from app.services.workspace_service import (
    create_workspace,
    list_workspaces,
    get_workspace,
    update_workspace,
    archive_workspace,
    restore_workspace,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.post("", response_model=WorkspaceResponse, status_code=201)
def create_workspace_endpoint(
    data: WorkspaceCreate,
    db: Session = Depends(get_db),
):
    return create_workspace(db, data)


@router.get("", response_model=list[WorkspaceResponse])
def list_workspaces_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    include_archived: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    tenant_id = get_current_tenant_table_id(request)
    return list_workspaces(db, tenant_id, include_archived, skip, limit)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace_endpoint(
    workspace_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    tenant_id = get_current_tenant_table_id(request)
    return get_workspace(db, workspace_id, tenant_id)


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace_endpoint(
    workspace_id: int,
    data: WorkspaceUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    tenant_id = get_current_tenant_table_id(request)
    return update_workspace(db, workspace_id, tenant_id, data)


@router.patch("/{workspace_id}/archive", response_model=WorkspaceResponse)
def archive_workspace_endpoint(
    workspace_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    tenant_id = get_current_tenant_table_id(request)
    return archive_workspace(db, workspace_id, tenant_id)


@router.patch("/{workspace_id}/restore", response_model=WorkspaceResponse)
def restore_workspace_endpoint(
    workspace_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    tenant_id = get_current_tenant_table_id(request)
    return restore_workspace(db, workspace_id, tenant_id)
