from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.workspace_member import (
    WorkspaceMemberAddRequest,
    WorkspaceMemberRoleUpdate,
    WorkspaceMemberResponse,
)
from app.routes.deps import get_db
from app.services.workspace_member_service import (
    add_member,
    list_members,
    update_member_role,
    remove_member,
)

router = APIRouter(prefix="/workspaces", tags=["Workspace Members"])


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberResponse, status_code=201)
def add_member_endpoint(
    workspace_id: int,
    data: WorkspaceMemberAddRequest,
    db: Session = Depends(get_db),
):
    return add_member(db, workspace_id, data)


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberResponse])
def list_members_endpoint(
    workspace_id: int,
    db: Session = Depends(get_db),
    include_inactive: bool = Query(False),
):
    return list_members(db, workspace_id, include_inactive)


@router.patch(
    "/{workspace_id}/members/{user_id}/role",
    response_model=WorkspaceMemberResponse,
)
def update_member_role_endpoint(
    workspace_id: int,
    user_id: int,
    data: WorkspaceMemberRoleUpdate,
    db: Session = Depends(get_db),
):
    return update_member_role(db, workspace_id, user_id, data)


@router.delete("/{workspace_id}/members/{user_id}", status_code=204)
def remove_member_endpoint(
    workspace_id: int,
    user_id: int,
    db: Session = Depends(get_db),
):
    remove_member(db, workspace_id, user_id)
