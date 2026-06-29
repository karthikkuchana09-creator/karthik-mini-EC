from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.ai_meeting_summary import AIMeetingSummary
from app.models.user import User
from app.schemas.ai_meeting_summary import AIMeetingSummaryCreate, AIMeetingSummaryUpdate
from app.services.business_validation_service import get_meeting_or_404, validate_workspace_member
from app.core.log import get_logger

logger = get_logger("ai_meeting_summary_service")


def create_summary(
    db: Session,
    meeting_id: int,
    data: AIMeetingSummaryCreate,
    user: User,
) -> AIMeetingSummary:
    meeting = get_meeting_or_404(db, meeting_id)
    validate_workspace_member(db, meeting.project.workspace_id, user)

    existing = db.scalar(
        select(AIMeetingSummary).where(AIMeetingSummary.meeting_id == meeting_id)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Summary already exists for this meeting. Use PUT to update.",
        )

    summary = AIMeetingSummary(
        meeting_id=meeting_id,
        summary=data.summary,
        action_items=data.action_items,
        key_decisions=data.key_decisions,
        tenant_id=meeting.tenant_id,
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    logger.info("Created AI summary id=%d for meeting id=%d", summary.id, meeting_id)
    return summary


def get_summary(
    db: Session,
    meeting_id: int,
    user: User,
) -> AIMeetingSummary:
    meeting = get_meeting_or_404(db, meeting_id)
    validate_workspace_member(db, meeting.project.workspace_id, user)

    summary = db.scalar(
        select(AIMeetingSummary).where(AIMeetingSummary.meeting_id == meeting_id)
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI summary not found for this meeting",
        )
    return summary


def update_summary(
    db: Session,
    meeting_id: int,
    data: AIMeetingSummaryUpdate,
    user: User,
) -> AIMeetingSummary:
    meeting = get_meeting_or_404(db, meeting_id)
    validate_workspace_member(db, meeting.project.workspace_id, user)

    summary = db.scalar(
        select(AIMeetingSummary).where(AIMeetingSummary.meeting_id == meeting_id)
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI summary not found for this meeting",
        )

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(summary, field, value)

    db.commit()
    db.refresh(summary)
    logger.info("Updated AI summary id=%d for meeting id=%d", summary.id, meeting_id)
    return summary
