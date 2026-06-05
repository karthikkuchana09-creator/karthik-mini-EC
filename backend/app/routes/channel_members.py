from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.channel_member import ChannelMemberResponse
from app.routes.deps import get_db
from app.services.channel_member_service import (
    join_channel,
    leave_channel,
)

router = APIRouter(prefix="/channels", tags=["Channel Members"])


@router.post("/{channel_id}/join", response_model=ChannelMemberResponse, status_code=201)
def join_channel_endpoint(
    channel_id: int,
    user_id: int,
    db: Session = Depends(get_db),
):
    return join_channel(db, channel_id, user_id)


@router.post("/{channel_id}/leave", status_code=204)
def leave_channel_endpoint(
    channel_id: int,
    user_id: int,
    db: Session = Depends(get_db),
):
    leave_channel(db, channel_id, user_id)
