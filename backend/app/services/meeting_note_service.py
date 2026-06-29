from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.meeting_note import MeetingNote
from app.models.user import User
from app.schemas.meeting_note import MeetingNoteCreate, MeetingNoteUpdate
from app.services.business_validation_service import get_meeting_or_404, validate_workspace_member
from app.core.log import get_logger

logger = get_logger("meeting_note_service")


def create_note(
    db: Session,
    meeting_id: int,
    data: MeetingNoteCreate,
    user: User,
) -> MeetingNote:
    meeting = get_meeting_or_404(db, meeting_id)
    validate_workspace_member(db, meeting.project.workspace_id, user)

    note = MeetingNote(
        meeting_id=meeting_id,
        content=data.content,
        created_by=user.id,
        tenant_id=meeting.tenant_id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    logger.info("Created note id=%d for meeting id=%d", note.id, meeting_id)
    return note


def list_notes(
    db: Session,
    meeting_id: int,
    user: User,
) -> list[MeetingNote]:
    meeting = get_meeting_or_404(db, meeting_id)
    validate_workspace_member(db, meeting.project.workspace_id, user)

    stmt = (
        select(MeetingNote)
        .where(MeetingNote.meeting_id == meeting_id)
        .order_by(MeetingNote.created_at.asc())
    )
    return list(db.scalars(stmt).all())


def update_note(
    db: Session,
    meeting_id: int,
    note_id: int,
    data: MeetingNoteUpdate,
    user: User,
) -> MeetingNote:
    meeting = get_meeting_or_404(db, meeting_id)
    validate_workspace_member(db, meeting.project.workspace_id, user)

    note = get_note_or_404(db, note_id, meeting_id)
    note.content = data.content
    db.commit()
    db.refresh(note)
    logger.info("Updated note id=%d for meeting id=%d", note_id, meeting_id)
    return note
