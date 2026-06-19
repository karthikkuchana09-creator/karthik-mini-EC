from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.workspace_task import (
    WorkspaceTaskCreate,
    WorkspaceTaskUpdate,
    WorkspaceTaskStatusUpdate,
    WorkspaceTaskAssign,
    WorkspaceTaskResponse,
)
from app.models.user import User
from app.services.workspace_task_service import (
    create_workspace_task,
    list_workspace_tasks,
    get_workspace_task,
    update_workspace_task,
    delete_workspace_task,
    update_workspace_task_status,
    assign_workspace_task,
)
from fastapi_pagination import Page

router = APIRouter(tags=["Workspace Tasks"])


@router.post(
    "/workspaces/{workspace_id}/tasks",
    response_model=WorkspaceTaskResponse,
    status_code=201,
)
def create_workspace_task_endpoint(
    workspace_id: int,
    data: WorkspaceTaskCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return create_workspace_task(db, workspace_id, data, user, ip_address, user_agent)


@router.get(
    "/workspaces/{workspace_id}/tasks",
    response_model=Page[WorkspaceTaskResponse],
)
def list_workspace_tasks_endpoint(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_workspace_tasks(db, workspace_id, user)


@router.get(
    "/workspaces/{workspace_id}/tasks/{task_id}",
    response_model=WorkspaceTaskResponse,
)
def get_workspace_task_endpoint(
    workspace_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_workspace_task(db, workspace_id, task_id, user)


@router.put(
    "/workspaces/{workspace_id}/tasks/{task_id}",
    response_model=WorkspaceTaskResponse,
)
def update_workspace_task_endpoint(
    workspace_id: int,
    task_id: int,
    data: WorkspaceTaskUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return update_workspace_task(db, workspace_id, task_id, data, user, ip_address, user_agent)


@router.delete(
    "/workspaces/{workspace_id}/tasks/{task_id}",
)
def delete_workspace_task_endpoint(
    workspace_id: int,
    task_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return delete_workspace_task(db, workspace_id, task_id, user, ip_address, user_agent)


@router.patch(
    "/workspaces/{workspace_id}/tasks/{task_id}/status",
    response_model=WorkspaceTaskResponse,
)
def update_workspace_task_status_endpoint(
    workspace_id: int,
    task_id: int,
    data: WorkspaceTaskStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return update_workspace_task_status(db, workspace_id, task_id, data, user, ip_address, user_agent)


@router.patch(
    "/workspaces/{workspace_id}/tasks/{task_id}/assign",
    response_model=WorkspaceTaskResponse,
)
def assign_workspace_task_endpoint(
    workspace_id: int,
    task_id: int,
    data: WorkspaceTaskAssign,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return assign_workspace_task(db, workspace_id, task_id, data, user, ip_address, user_agent)
