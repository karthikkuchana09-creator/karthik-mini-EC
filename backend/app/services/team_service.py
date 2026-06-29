from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamUpdate
from app.services.business_validation_service import (
    get_workspace_or_404, get_team_or_404, validate_tenant_match, validate_workspace_not_archived,
)
from app.core.log import get_logger

logger = get_logger("team_service")


def create_team(db: Session, data: TeamCreate) -> Team:
    workspace = get_workspace_or_404(db, data.workspace_id)
    validate_tenant_match(workspace, data.tenant_id, "Workspace")
    validate_workspace_not_archived(workspace)

    team = Team(
        tenant_id=data.tenant_id,
        workspace_id=data.workspace_id,
        name=data.name,
        description=data.description,
        created_by=data.created_by,
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    logger.info(
        "Created team id=%d workspace_id=%d tenant_id=%d",
        team.id, team.workspace_id, team.tenant_id,
    )
    return team


def list_teams(
    db: Session,
    tenant_id: int,
    workspace_id: Optional[int] = None,
) -> list:
    stmt = select(Team).where(Team.tenant_id == tenant_id)
    if workspace_id is not None:
        stmt = stmt.where(Team.workspace_id == workspace_id)
    stmt = stmt.order_by(Team.created_at.desc())
    return list(db.scalars(stmt).all())


def get_team(db: Session, team_id: int) -> Team:
    return get_team_or_404(db, team_id)


def update_team(db: Session, team_id: int, data: TeamUpdate) -> Team:
    team = get_team_or_404(db, team_id)

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(team, field, value)

    db.commit()
    db.refresh(team)
    logger.info("Updated team id=%d", team.id)
    return team


def delete_team(db: Session, team_id: int) -> None:
    team = get_team_or_404(db, team_id)
    db.delete(team)
    db.commit()
    logger.info("Deleted team id=%d", team.id)
