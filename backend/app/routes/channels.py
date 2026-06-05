from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.schemas.channel import ChannelCreate, ChannelUpdate, ChannelResponse
from app.routes.deps import get_db
from app.services.channel_service import (
    create_channel,
    get_channel,
    update_channel,
    archive_channel,
    restore_channel,
)

router = APIRouter(prefix="/channels", tags=["Channels"])


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
