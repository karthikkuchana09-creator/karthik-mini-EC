from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.core.tenant import get_current_tenant_table_id
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
    pin_message,
    unpin_message,
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
    tenant_table_id = get_current_tenant_table_id(request)
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return create_message(db, workspace_id, data, user, tenant_table_id, ip_address, user_agent)


@router.get(
    "/workspaces/{workspace_id}/messages",
    response_model=Page[WorkspaceMessageResponse],
)
def list_workspace_messages(
    workspace_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tenant_table_id = get_current_tenant_table_id(request)
    return list_messages(db, workspace_id, user, tenant_table_id)


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


@router.patch(
    "/workspaces/{workspace_id}/messages/{message_id}/pin",
    response_model=WorkspaceMessageResponse,
)
def pin_workspace_message(
    workspace_id: int,
    message_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return pin_message(db, workspace_id, message_id, user, ip_address, user_agent)


@router.patch(
    "/workspaces/{workspace_id}/messages/{message_id}/unpin",
    response_model=WorkspaceMessageResponse,
)
def unpin_workspace_message(
    workspace_id: int,
    message_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return unpin_message(db, workspace_id, message_id, user, ip_address, user_agent)
