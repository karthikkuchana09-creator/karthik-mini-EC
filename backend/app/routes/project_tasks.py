from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.project_task import (
    ProjectTaskCreate,
    ProjectTaskUpdate,
    ProjectTaskStatusUpdate,
    ProjectTaskAssign,
    ProjectTaskResponse,
)
from app.models.user import User
from app.services.project_task_service import (
    create_project_task,
    list_project_tasks,
    get_project_task,
    update_project_task,
    delete_project_task,
    update_project_task_status,
    assign_project_task,
)
from fastapi_pagination import Page

router = APIRouter(tags=["Project Tasks"])


@router.post(
    "/projects/{project_id}/tasks",
    response_model=ProjectTaskResponse,
    status_code=201,
)
def create_project_task_endpoint(
    project_id: int,
    data: ProjectTaskCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return create_project_task(db, project_id, data, user, ip_address, user_agent)


@router.get(
    "/projects/{project_id}/tasks",
    response_model=Page[ProjectTaskResponse],
)
def list_project_tasks_endpoint(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_project_tasks(db, project_id, user)


@router.get(
    "/projects/{project_id}/tasks/{task_id}",
    response_model=ProjectTaskResponse,
)
def get_project_task_endpoint(
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_project_task(db, project_id, task_id, user)


@router.put(
    "/projects/{project_id}/tasks/{task_id}",
    response_model=ProjectTaskResponse,
)
def update_project_task_endpoint(
    project_id: int,
    task_id: int,
    data: ProjectTaskUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return update_project_task(db, project_id, task_id, data, user, ip_address, user_agent)


@router.delete(
    "/projects/{project_id}/tasks/{task_id}",
)
def delete_project_task_endpoint(
    project_id: int,
    task_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return delete_project_task(db, project_id, task_id, user, ip_address, user_agent)


@router.patch(
    "/projects/{project_id}/tasks/{task_id}/status",
    response_model=ProjectTaskResponse,
)
def update_project_task_status_endpoint(
    project_id: int,
    task_id: int,
    data: ProjectTaskStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return update_project_task_status(db, project_id, task_id, data, user, ip_address, user_agent)


@router.patch(
    "/projects/{project_id}/tasks/{task_id}/assign",
    response_model=ProjectTaskResponse,
)
def assign_project_task_endpoint(
    project_id: int,
    task_id: int,
    data: ProjectTaskAssign,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return assign_project_task(db, project_id, task_id, data, user, ip_address, user_agent)
