from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.workspace_message import (
    WorkspaceMessageCreate,
    WorkspaceMessageUpdate,
    WorkspaceMessageResponse,
)
from app.models.user import User
from app.services.workspace_message_service import (
    create_message,
    list_messages,
    update_message,
    delete_message,
)
from fastapi_pagination import Page

router = APIRouter(tags=["Workspace Messages"])


@router.post(
    "/workspaces/{workspace_id}/messages",
    response_model=WorkspaceMessageResponse,
    status_code=201,
)
def create_workspace_message(
    workspace_id: int,
    data: WorkspaceMessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return create_message(db, workspace_id, data, user, ip_address, user_agent)


@router.get(
    "/workspaces/{workspace_id}/messages",
    response_model=Page[WorkspaceMessageResponse],
)
def list_workspace_messages(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_messages(db, workspace_id, user)


@router.put(
    "/workspace-messages/{message_id}",
    response_model=WorkspaceMessageResponse,
)
def update_workspace_message(
    message_id: int,
    data: WorkspaceMessageUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return update_message(db, message_id, data, user, ip_address, user_agent)


@router.delete(
    "/workspace-messages/{message_id}",
)
def delete_workspace_message(
    message_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return delete_message(db, message_id, user, ip_address, user_agent)
