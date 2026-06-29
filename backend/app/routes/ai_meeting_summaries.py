from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.ai_meeting_summary import AIMeetingSummaryCreate, AIMeetingSummaryUpdate, AIMeetingSummaryResponse
from app.models.user import User
from app.services.ai_meeting_summary_service import (
    create_summary,
    get_summary,
    update_summary,
)

router = APIRouter(tags=["AI Meeting Summaries"])


@router.post(
    "/projects/{project_id}/meetings/{meeting_id}/ai-summary",
    response_model=AIMeetingSummaryResponse,
    status_code=201,
)
def create_summary_endpoint(
    project_id: int,
    meeting_id: int,
    data: AIMeetingSummaryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return create_summary(db, meeting_id, data, user)


@router.get(
    "/projects/{project_id}/meetings/{meeting_id}/ai-summary",
    response_model=AIMeetingSummaryResponse,
)
def get_summary_endpoint(
    project_id: int,
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_summary(db, meeting_id, user)


@router.put(
    "/projects/{project_id}/meetings/{meeting_id}/ai-summary",
    response_model=AIMeetingSummaryResponse,
)
def update_summary_endpoint(
    project_id: int,
    meeting_id: int,
    data: AIMeetingSummaryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return update_summary(db, meeting_id, data, user)
