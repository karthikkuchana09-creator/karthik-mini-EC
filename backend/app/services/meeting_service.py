from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.meeting import Meeting, MeetingStatus
from app.models.user import User
from app.schemas.meeting import MeetingCreate, MeetingUpdate
from app.services.business_validation_service import get_project_or_404, get_meeting_or_404, validate_workspace_member
from app.core.tenant import tenant_filter
from app.core.log import get_logger

logger = get_logger("meeting_service")


def create_meeting(
    db: Session,
    project_id: int,
    data: MeetingCreate,
    user: User,
) -> Meeting:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    if data.end_time and data.start_time and data.end_time <= data.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time",
        )

    tid = getattr(user, "tenant_id", None)
    meeting = Meeting(
        project_id=project_id,
        title=data.title,
        description=data.description,
        meeting_date=data.meeting_date,
        start_time=data.start_time,
        end_time=data.end_time,
        location=data.location,
        meeting_link=data.meeting_link,
        status=MeetingStatus.SCHEDULED,
        created_by=user.id,
        tenant_id=tid,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    logger.info(
        "Created meeting id=%d for project id=%d by user %d",
        meeting.id, project_id, user.id,
    )
    return meeting


def list_meetings(
    db: Session,
    project_id: int,
    user: User,
) -> list[Meeting]:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    stmt = tenant_filter(select(Meeting), Meeting, tid).where(
        Meeting.project_id == project_id
    ).order_by(Meeting.meeting_date.desc(), Meeting.start_time.asc())

    return list(db.scalars(stmt).all())


def get_meeting(
    db: Session,
    project_id: int,
    meeting_id: int,
    user: User,
) -> Meeting:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    meeting = db.scalar(
        tenant_filter(select(Meeting), Meeting, tid).where(
            Meeting.id == meeting_id,
            Meeting.project_id == project_id,
        )
    )
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )
    return meeting


def update_meeting(
    db: Session,
    project_id: int,
    meeting_id: int,
    data: MeetingUpdate,
    user: User,
) -> Meeting:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    meeting = db.scalar(
        tenant_filter(select(Meeting), Meeting, tid).where(
            Meeting.id == meeting_id,
            Meeting.project_id == project_id,
        )
    )
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )

    update_fields = data.model_dump(exclude_unset=True)

    if "end_time" in update_fields or "start_time" in update_fields:
        start = update_fields.get("start_time", meeting.start_time)
        end = update_fields.get("end_time", meeting.end_time)
        if end and start and end <= start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time",
            )

    for field, value in update_fields.items():
        if field == "status":
            value = MeetingStatus(value)
        setattr(meeting, field, value)

    meeting.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(meeting)
    logger.info("Updated meeting id=%d by user %d", meeting_id, user.id)
    return meeting


def cancel_meeting(
    db: Session,
    project_id: int,
    meeting_id: int,
    user: User,
) -> Meeting:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    meeting = db.scalar(
        tenant_filter(select(Meeting), Meeting, tid).where(
            Meeting.id == meeting_id,
            Meeting.project_id == project_id,
        )
    )
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )

    meeting.status = MeetingStatus.CANCELLED
    meeting.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(meeting)
    logger.info("Cancelled meeting id=%d by user %d", meeting_id, user.id)
    return meeting
