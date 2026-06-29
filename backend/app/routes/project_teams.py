from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.project_team import ProjectTeamAssignRequest, ProjectTeamResponse
from app.routes.deps import get_db, get_current_user
from app.models.user import User
from app.services.project_team_service import (
    assign_team,
    list_assigned_teams,
    unassign_team,
)

router = APIRouter(tags=["Project Teams"])


@router.post("/projects/{project_id}/teams", response_model=ProjectTeamResponse, status_code=201)
def assign_team_endpoint(
    project_id: int,
    data: ProjectTeamAssignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return assign_team(db, project_id, data.team_id)


@router.get("/projects/{project_id}/teams", response_model=list[ProjectTeamResponse])
def list_assigned_teams_endpoint(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_assigned_teams(db, project_id)


@router.delete("/projects/{project_id}/teams/{team_id}", status_code=204)
def unassign_team_endpoint(
    project_id: int,
    team_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    unassign_team(db, project_id, team_id)
