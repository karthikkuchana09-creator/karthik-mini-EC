from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.meeting import MeetingCreate, MeetingUpdate, MeetingResponse
from app.models.user import User
from app.services.meeting_service import (
    create_meeting,
    list_meetings,
    get_meeting,
    update_meeting,
    cancel_meeting,
)

router = APIRouter(tags=["Project Meetings"])


@router.post(
    "/projects/{project_id}/meetings",
    response_model=MeetingResponse,
    status_code=201,
)
def create_meeting_endpoint(
    project_id: int,
    data: MeetingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return create_meeting(db, project_id, data, user)


@router.get(
    "/projects/{project_id}/meetings",
    response_model=list[MeetingResponse],
)
def list_meetings_endpoint(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_meetings(db, project_id, user)


@router.get(
    "/projects/{project_id}/meetings/{meeting_id}",
    response_model=MeetingResponse,
)
def get_meeting_endpoint(
    project_id: int,
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_meeting(db, project_id, meeting_id, user)


@router.put(
    "/projects/{project_id}/meetings/{meeting_id}",
    response_model=MeetingResponse,
)
def update_meeting_endpoint(
    project_id: int,
    meeting_id: int,
    data: MeetingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return update_meeting(db, project_id, meeting_id, data, user)


@router.delete(
    "/projects/{project_id}/meetings/{meeting_id}",
    response_model=MeetingResponse,
)
def cancel_meeting_endpoint(
    project_id: int,
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return cancel_meeting(db, project_id, meeting_id, user)
