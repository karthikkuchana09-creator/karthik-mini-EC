from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.channel_task import (
    ChannelTaskCreate,
    ChannelTaskUpdate,
    ChannelTaskStatusUpdate,
    ChannelTaskAssign,
    ChannelTaskResponse,
)
from app.models.user import User
from app.services.channel_task_service import (
    create_channel_task,
    list_channel_tasks,
    get_channel_task,
    update_channel_task,
    delete_channel_task,
    update_channel_task_status,
    assign_channel_task,
)
from fastapi_pagination import Page

router = APIRouter(tags=["Channel Tasks"])


@router.post(
    "/channels/{channel_id}/tasks",
    response_model=ChannelTaskResponse,
    status_code=201,
)
def create_channel_task_endpoint(
    channel_id: int,
    data: ChannelTaskCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return create_channel_task(db, channel_id, data, user, ip_address, user_agent)


@router.get(
    "/channels/{channel_id}/tasks",
    response_model=Page[ChannelTaskResponse],
)
def list_channel_tasks_endpoint(
    channel_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_channel_tasks(db, channel_id, user)


@router.get(
    "/channels/{channel_id}/tasks/{task_id}",
    response_model=ChannelTaskResponse,
)
def get_channel_task_endpoint(
    channel_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_channel_task(db, channel_id, task_id, user)


@router.put(
    "/channels/{channel_id}/tasks/{task_id}",
    response_model=ChannelTaskResponse,
)
def update_channel_task_endpoint(
    channel_id: int,
    task_id: int,
    data: ChannelTaskUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return update_channel_task(db, channel_id, task_id, data, user, ip_address, user_agent)


@router.delete(
    "/channels/{channel_id}/tasks/{task_id}",
)
def delete_channel_task_endpoint(
    channel_id: int,
    task_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return delete_channel_task(db, channel_id, task_id, user, ip_address, user_agent)


@router.patch(
    "/channels/{channel_id}/tasks/{task_id}/status",
    response_model=ChannelTaskResponse,
)
def update_channel_task_status_endpoint(
    channel_id: int,
    task_id: int,
    data: ChannelTaskStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return update_channel_task_status(db, channel_id, task_id, data, user, ip_address, user_agent)


@router.patch(
    "/channels/{channel_id}/tasks/{task_id}/assign",
    response_model=ChannelTaskResponse,
)
def assign_channel_task_endpoint(
    channel_id: int,
    task_id: int,
    data: ChannelTaskAssign,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return assign_channel_task(db, channel_id, task_id, data, user, ip_address, user_agent)
