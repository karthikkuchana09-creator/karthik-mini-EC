from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.meeting_note import MeetingNoteCreate, MeetingNoteUpdate, MeetingNoteResponse
from app.models.user import User
from app.services.meeting_note_service import (
    create_note,
    list_notes,
    update_note,
)

router = APIRouter(tags=["Meeting Notes"])


@router.post(
    "/projects/{project_id}/meetings/{meeting_id}/notes",
    response_model=MeetingNoteResponse,
    status_code=201,
)
def create_note_endpoint(
    project_id: int,
    meeting_id: int,
    data: MeetingNoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return create_note(db, meeting_id, data, user)


@router.get(
    "/projects/{project_id}/meetings/{meeting_id}/notes",
    response_model=list[MeetingNoteResponse],
)
def list_notes_endpoint(
    project_id: int,
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_notes(db, meeting_id, user)


@router.put(
    "/projects/{project_id}/meetings/{meeting_id}/notes/{note_id}",
    response_model=MeetingNoteResponse,
)
def update_note_endpoint(
    project_id: int,
    meeting_id: int,
    note_id: int,
    data: MeetingNoteUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return update_note(db, meeting_id, note_id, data, user)
