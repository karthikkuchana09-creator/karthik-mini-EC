from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.channel import ChannelResponse
from app.routes.deps import get_db, get_current_user
from app.models.user import User
from app.services.channel_service import (
    link_channel_to_project,
    remove_channel_from_project,
    list_channels_by_project,
)
from pydantic import BaseModel, Field


class LinkChannelRequest(BaseModel):
    channel_id: int = Field(gt=0)


router = APIRouter(tags=["Project Channels"])


@router.post("/projects/{project_id}/channels", response_model=ChannelResponse, status_code=201)
def link_channel_endpoint(
    project_id: int,
    data: LinkChannelRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return link_channel_to_project(db, data.channel_id, project_id)


@router.get("/projects/{project_id}/channels", response_model=list[ChannelResponse])
def list_project_channels_endpoint(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    include_archived: bool = Query(False),
):
    return list_channels_by_project(db, project_id, include_archived)


@router.delete("/projects/{project_id}/channels/{channel_id}", response_model=ChannelResponse)
def remove_channel_endpoint(
    project_id: int,
    channel_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return remove_channel_from_project(db, channel_id)
