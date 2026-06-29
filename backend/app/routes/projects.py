from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.routes.deps import get_db, get_current_user
from app.models.user import User
from app.core.tenant import get_current_tenant_table_id
from app.services.project_service import (
    create_project,
    list_projects,
    get_project,
    update_project,
    archive_project,
)

router = APIRouter(tags=["Projects"])


@router.get("/projects", response_model=list[ProjectResponse])
def list_projects_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    workspace_id: Optional[int] = Query(None),
    include_archived: bool = Query(False),
):
    tenant_id = get_current_tenant_table_id(request)
    return list_projects(db, tenant_id, workspace_id, include_archived)


@router.post("/projects", response_model=ProjectResponse, status_code=201)
def create_project_endpoint(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return create_project(db, data)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project_endpoint(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tenant_id = get_current_tenant_table_id(request)
    return get_project(db, project_id, tenant_id)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project_endpoint(
    project_id: int,
    data: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tenant_id = get_current_tenant_table_id(request)
    return update_project(db, project_id, tenant_id, data)


@router.delete("/projects/{project_id}", response_model=ProjectResponse)
def archive_project_endpoint(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tenant_id = get_current_tenant_table_id(request)
    return archive_project(db, project_id, tenant_id)
