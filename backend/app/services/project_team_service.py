from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.project_team import ProjectTeam
from app.models.team import Team
from app.models.team_member import TeamMember
from app.services.business_validation_service import (
    get_project_or_404, get_team_or_404, validate_same_tenant,
    validate_same_workspace, validate_no_duplicate_project_team,
)
from app.core.log import get_logger

logger = get_logger("project_team_service")


def assign_team(db: Session, project_id: int, team_id: int) -> ProjectTeam:
    project = get_project_or_404(db, project_id)
    team = get_team_or_404(db, team_id)

    validate_same_tenant(project, team, "Project", "Team")
    validate_same_workspace(project, team, "Project", "Team")
    validate_no_duplicate_project_team(db, project_id, team_id)

    link = ProjectTeam(
        project_id=project_id,
        team_id=team_id,
        tenant_id=project.tenant_id,
    )
    db.add(link)
    db.commit()

    link = db.scalar(
        select(ProjectTeam)
        .options(
            selectinload(ProjectTeam.team).selectinload(Team.members).selectinload(TeamMember.user)
        )
        .where(ProjectTeam.id == link.id)
    )
    logger.info(
        "Assigned team id=%d to project id=%d", team_id, project_id,
    )
    return link


def list_assigned_teams(db: Session, project_id: int) -> list[ProjectTeam]:
    get_project_or_404(db, project_id)

    stmt = (
        select(ProjectTeam)
        .options(
            selectinload(ProjectTeam.team).selectinload(Team.members).selectinload(TeamMember.user)
        )
        .where(ProjectTeam.project_id == project_id)
        .order_by(ProjectTeam.created_at.asc())
    )
    return list(db.scalars(stmt).all())


def unassign_team(db: Session, project_id: int, team_id: int) -> None:
    get_project_or_404(db, project_id)

    link = db.scalar(
        select(ProjectTeam).where(
            ProjectTeam.project_id == project_id,
            ProjectTeam.team_id == team_id,
        )
    )
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team is not assigned to this project",
        )

    db.delete(link)
    db.commit()
    logger.info(
        "Unassigned team id=%d from project id=%d", team_id, project_id,
    )
