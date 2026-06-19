from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.schemas.channel import ChannelCreate, ChannelUpdate, ChannelResponse
from app.routes.deps import get_db
from app.core.tenant import get_current_tenant_table_id
from app.services.channel_service import (
    create_channel,
    list_channels,
    get_channel,
    update_channel,
    archive_channel,
    restore_channel,
)

router = APIRouter(prefix="/channels", tags=["Channels"])


@router.get("", response_model=list[ChannelResponse])
def list_channels_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    workspace_id: Optional[int] = Query(None),
    include_archived: bool = Query(False),
):
    tenant_id = get_current_tenant_table_id(request)
    return list_channels(db, tenant_id, workspace_id, include_archived)


@router.post("", response_model=ChannelResponse, status_code=201)
def create_channel_endpoint(
    data: ChannelCreate,
    db: Session = Depends(get_db),
):
    return create_channel(db, data)


@router.get("/{channel_id}", response_model=ChannelResponse)
def get_channel_endpoint(
    channel_id: int,
    db: Session = Depends(get_db),
):
    return get_channel(db, channel_id)


@router.put("/{channel_id}", response_model=ChannelResponse)
def update_channel_endpoint(
    channel_id: int,
    data: ChannelUpdate,
    db: Session = Depends(get_db),
):
    return update_channel(db, channel_id, data)


@router.patch("/{channel_id}/archive", response_model=ChannelResponse)
def archive_channel_endpoint(
    channel_id: int,
    db: Session = Depends(get_db),
):
    return archive_channel(db, channel_id)


@router.patch("/{channel_id}/restore", response_model=ChannelResponse)
def restore_channel_endpoint(
    channel_id: int,
    db: Session = Depends(get_db),
):
    return restore_channel(db, channel_id)
