from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.team_member import TeamMember, TeamMemberRole
from app.schemas.team_member import TeamMemberAddRequest
from app.services.business_validation_service import (
    get_team_or_404, get_user_or_404, validate_same_tenant,
    validate_workspace_member, validate_no_duplicate_team_member, validate_team_lead_limit,
)
from app.core.log import get_logger

logger = get_logger("team_member_service")


def add_member(db: Session, team_id: int, data: TeamMemberAddRequest) -> TeamMember:
    team = get_team_or_404(db, team_id)
    user = get_user_or_404(db, data.user_id)

    validate_same_tenant(user, team, "User", "Team")
    validate_workspace_member(db, team.workspace_id, user)
    validate_no_duplicate_team_member(db, team_id, data.user_id)

    if data.role == "LEAD":
        validate_team_lead_limit(db, team_id)

    member = TeamMember(
        team_id=team_id,
        user_id=data.user_id,
        role=TeamMemberRole(data.role),
        tenant_id=team.tenant_id,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    logger.info(
        "Added team member team_id=%d user_id=%d role=%s",
        team_id, data.user_id, data.role,
    )
    return member


def list_members(db: Session, team_id: int) -> list[TeamMember]:
    get_team_or_404(db, team_id)

    stmt = (
        select(TeamMember)
        .options(selectinload(TeamMember.user))
        .where(TeamMember.team_id == team_id)
        .order_by(TeamMember.joined_at.asc())
    )
    return list(db.scalars(stmt).all())


def remove_member(db: Session, team_id: int, user_id: int) -> None:
    get_team_or_404(db, team_id)

    member = db.scalar(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this team",
        )

    db.delete(member)
    db.commit()
    logger.info("Removed team member team_id=%d user_id=%d", team_id, user_id)
