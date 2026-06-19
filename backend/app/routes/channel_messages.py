from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.core.tenant import get_current_tenant_table_id
from app.schemas.channel_message import (
    ChannelMessageCreate,
    ChannelMessageUpdate,
    ChannelMessageResponse,
)
from app.models.user import User
from app.services.channel_message_service import (
    create_message,
    list_messages,
    update_message,
    delete_message,
    pin_message,
    unpin_message,
)
from fastapi_pagination import Page

router = APIRouter(tags=["Channel Messages"])


@router.post(
    "/channels/{channel_id}/messages",
    response_model=ChannelMessageResponse,
    status_code=201,
)
def create_channel_message(
    channel_id: int,
    data: ChannelMessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tenant_table_id = get_current_tenant_table_id(request)
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return create_message(db, channel_id, data, user, tenant_table_id, ip_address, user_agent)


@router.get(
    "/channels/{channel_id}/messages",
    response_model=Page[ChannelMessageResponse],
)
def list_channel_messages(
    channel_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tenant_table_id = get_current_tenant_table_id(request)
    return list_messages(db, channel_id, user, tenant_table_id)


@router.put(
    "/channel-messages/{message_id}",
    response_model=ChannelMessageResponse,
)
def update_channel_message(
    message_id: int,
    data: ChannelMessageUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return update_message(db, message_id, data, user, ip_address, user_agent)


@router.delete(
    "/channel-messages/{message_id}",
)
def delete_channel_message(
    message_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return delete_message(db, message_id, user, ip_address, user_agent)


@router.patch(
    "/channels/{channel_id}/messages/{message_id}/pin",
    response_model=ChannelMessageResponse,
)
def pin_channel_message(
    channel_id: int,
    message_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return pin_message(db, channel_id, message_id, user, ip_address, user_agent)


@router.patch(
    "/channels/{channel_id}/messages/{message_id}/unpin",
    response_model=ChannelMessageResponse,
)
def unpin_channel_message(
    channel_id: int,
    message_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return unpin_message(db, channel_id, message_id, user, ip_address, user_agent)
