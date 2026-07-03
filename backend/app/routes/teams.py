from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse
from app.routes.deps import get_db, get_current_user
from app.models.user import User
from app.core.tenant import get_current_tenant_table_id
from app.services.team_service import (
    create_team,
    list_teams,
    get_team,
    update_team,
    delete_team,
    archive_team,
    restore_team,
)

router = APIRouter(tags=["Teams"])


@router.get("/teams", response_model=list[TeamResponse])
def list_teams_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    workspace_id: Optional[int] = Query(None),
    include_archived: bool = Query(False),
):
    tenant_id = get_current_tenant_table_id(request)
    return list_teams(db, tenant_id, workspace_id, include_archived)


@router.post("/teams", response_model=TeamResponse, status_code=201)
def create_team_endpoint(
    request: Request,
    data: TeamCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tenant_id = get_current_tenant_table_id(request)
    payload = data.model_dump()
    payload["tenant_id"] = tenant_id
    payload["created_by"] = user.id
    return create_team(db, payload)


@router.get("/teams/{team_id}", response_model=TeamResponse)
def get_team_endpoint(
    team_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_team(db, team_id)


@router.put("/teams/{team_id}", response_model=TeamResponse)
def update_team_endpoint(
    team_id: int,
    data: TeamUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return update_team(db, team_id, data)


@router.delete("/teams/{team_id}", status_code=204)
def delete_team_endpoint(
    team_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    delete_team(db, team_id)


@router.patch("/teams/{team_id}/archive", response_model=TeamResponse)
def archive_team_endpoint(
    team_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return archive_team(db, team_id)


@router.patch("/teams/{team_id}/restore", response_model=TeamResponse)
def restore_team_endpoint(
    team_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return restore_team(db, team_id)
