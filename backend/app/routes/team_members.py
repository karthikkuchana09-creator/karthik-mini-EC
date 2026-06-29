from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.team_member import TeamMemberAddRequest, TeamMemberResponse
from app.routes.deps import get_db, get_current_user
from app.models.user import User
from app.services.team_member_service import (
    add_member,
    list_members,
    remove_member,
)

router = APIRouter(tags=["Team Members"])


@router.post("/teams/{team_id}/members", response_model=TeamMemberResponse, status_code=201)
def add_member_endpoint(
    team_id: int,
    data: TeamMemberAddRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return add_member(db, team_id, data)


@router.get("/teams/{team_id}/members", response_model=list[TeamMemberResponse])
def list_members_endpoint(
    team_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_members(db, team_id)


@router.delete("/teams/{team_id}/members/{user_id}", status_code=204)
def remove_member_endpoint(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    remove_member(db, team_id, user_id)
