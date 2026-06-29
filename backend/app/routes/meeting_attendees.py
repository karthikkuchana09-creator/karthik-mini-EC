from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.meeting_attendee import MeetingAttendeeAddRequest, MeetingAttendeeResponse
from app.routes.deps import get_db, get_current_user
from app.models.user import User
from app.services.meeting_attendee_service import (
    add_attendee,
    list_attendees,
    remove_attendee,
)

router = APIRouter(tags=["Meeting Attendees"])


@router.post(
    "/projects/{project_id}/meetings/{meeting_id}/attendees",
    response_model=MeetingAttendeeResponse,
    status_code=201,
)
def add_attendee_endpoint(
    project_id: int,
    meeting_id: int,
    data: MeetingAttendeeAddRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return add_attendee(db, meeting_id, data)


@router.get(
    "/projects/{project_id}/meetings/{meeting_id}/attendees",
    response_model=list[MeetingAttendeeResponse],
)
def list_attendees_endpoint(
    project_id: int,
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_attendees(db, meeting_id)


@router.delete(
    "/projects/{project_id}/meetings/{meeting_id}/attendees/{user_id}",
    status_code=204,
)
def remove_attendee_endpoint(
    project_id: int,
    meeting_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    remove_attendee(db, meeting_id, user_id)
