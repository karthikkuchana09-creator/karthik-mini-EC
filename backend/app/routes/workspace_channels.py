from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.channel import ChannelResponse
from app.routes.deps import get_db
from app.services.channel_service import list_channels_by_workspace

router = APIRouter(prefix="/workspaces", tags=["Workspace Channels"])


@router.get("/{workspace_id}/channels", response_model=list[ChannelResponse])
def list_channels_by_workspace_endpoint(
    workspace_id: int,
    db: Session = Depends(get_db),
    include_archived: bool = Query(False),
):
    return list_channels_by_workspace(db, workspace_id, include_archived)
