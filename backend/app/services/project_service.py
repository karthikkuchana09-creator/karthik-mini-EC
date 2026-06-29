from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectStatus, ProjectPriority
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.business_validation_service import (
    get_workspace_or_404, get_project_or_404, validate_tenant_match,
    validate_workspace_not_archived, validate_owner_in_workspace,
)
from app.core.log import get_logger

logger = get_logger("project_service")


def create_project(db: Session, data: ProjectCreate) -> Project:
    workspace = get_workspace_or_404(db, data.workspace_id)
    validate_tenant_match(workspace, data.tenant_id, "Workspace")
    validate_workspace_not_archived(workspace)
    validate_owner_in_workspace(db, data.created_by, data.workspace_id)

    project = Project(
        tenant_id=data.tenant_id,
        workspace_id=data.workspace_id,
        name=data.name,
        description=data.description,
        status=ProjectStatus(data.status),
        priority=ProjectPriority(data.priority),
        start_date=data.start_date,
        due_date=data.due_date,
        created_by=data.created_by,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    logger.info(
        "Created project id=%d workspace_id=%d tenant_id=%d",
        project.id, project.workspace_id, project.tenant_id,
    )
    return project


def list_projects(
    db: Session,
    tenant_id: int,
    workspace_id: Optional[int] = None,
    include_archived: bool = False,
) -> list[Project]:
    stmt = select(Project).where(Project.tenant_id == tenant_id)
    if workspace_id is not None:
        stmt = stmt.where(Project.workspace_id == workspace_id)
    if not include_archived:
        stmt = stmt.where(Project.is_archived == False)
    stmt = stmt.order_by(Project.created_at.desc())
    return list(db.scalars(stmt).all())


def get_project(db: Session, project_id: int, tenant_id: int) -> Project:
    project = get_project_or_404(db, project_id)
    if project.tenant_id is not None and project.tenant_id != tenant_id:
        from app.services.business_validation_service import _not_found
        _not_found("Project")
    return project


def update_project(
    db: Session, project_id: int, tenant_id: int, data: ProjectUpdate,
) -> Project:
    project = get_project(db, project_id, tenant_id)

    if project.is_archived:
        from app.services.business_validation_service import _bad_request
        _bad_request("Cannot update an archived project")

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        if field == "created_by" and value is not None:
            validate_owner_in_workspace(db, value, project.workspace_id)
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    logger.info("Updated project id=%d", project.id)
    return project


def archive_project(db: Session, project_id: int, tenant_id: int) -> Project:
    project = get_project(db, project_id, tenant_id)
    project.is_archived = True
    db.commit()
    db.refresh(project)
    logger.info("Archived project id=%d", project.id)
    return project
