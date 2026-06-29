from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.meeting_attendee import MeetingAttendee, AttendeeStatus
from app.schemas.meeting_attendee import MeetingAttendeeAddRequest
from app.services.business_validation_service import (
    get_meeting_or_404, validate_user_in_project_teams, validate_no_duplicate_meeting_attendee,
)
from app.core.log import get_logger

logger = get_logger("meeting_attendee_service")


def add_attendee(
    db: Session,
    meeting_id: int,
    data: MeetingAttendeeAddRequest,
) -> MeetingAttendee:
    meeting = get_meeting_or_404(db, meeting_id)
    validate_user_in_project_teams(db, data.user_id, meeting.project_id)
    validate_no_duplicate_meeting_attendee(db, meeting_id, data.user_id)

    attendee = MeetingAttendee(
        meeting_id=meeting_id,
        user_id=data.user_id,
        status=AttendeeStatus(data.status),
        tenant_id=meeting.tenant_id,
    )
    db.add(attendee)
    db.commit()
    db.refresh(attendee)
    logger.info(
        "Added attendee user_id=%d to meeting id=%d", data.user_id, meeting_id,
    )
    return attendee


def list_attendees(db: Session, meeting_id: int) -> list[MeetingAttendee]:
    get_meeting_or_404(db, meeting_id)

    stmt = (
        select(MeetingAttendee)
        .options(selectinload(MeetingAttendee.user))
        .where(MeetingAttendee.meeting_id == meeting_id)
        .order_by(MeetingAttendee.joined_at.asc())
    )
    return list(db.scalars(stmt).all())


def remove_attendee(db: Session, meeting_id: int, user_id: int) -> None:
    get_meeting_or_404(db, meeting_id)

    attendee = db.scalar(
        select(MeetingAttendee).where(
            MeetingAttendee.meeting_id == meeting_id,
            MeetingAttendee.user_id == user_id,
        )
    )
    if not attendee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendee not found for this meeting",
        )

    db.delete(attendee)
    db.commit()
    logger.info(
        "Removed attendee user_id=%d from meeting id=%d", user_id, meeting_id,
    )
