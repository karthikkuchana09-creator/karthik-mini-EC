import re
from typing import Optional
from sqlalchemy import select, func as sa_func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.tenant import Tenant
from app.models.workspace import Workspace, WorkspaceVisibility
from app.models.tenant_collaboration_settings import TenantCollaborationSettings
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.core.log import get_logger

logger = get_logger("workspace_service")


def _generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug)
    slug = slug.strip("-")
    if not slug:
        slug = "workspace"
    return slug


def _make_unique_slug(db: Session, tenant_id: int, base_slug: str) -> str:
    slug = base_slug
    counter = 1
    while db.scalar(
        select(Workspace).where(
            Workspace.tenant_id == tenant_id,
            Workspace.slug == slug,
        )
    ):
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def _get_tenant_or_404(db: Session, tenant_id: int) -> Tenant:
    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    return tenant


def _get_workspace_or_404(db: Session, workspace_id: int, tenant_id: int) -> Workspace:
    workspace = db.scalar(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.tenant_id == tenant_id,
        )
    )
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
    return workspace


def _check_workspace_limit(db: Session, tenant_id: int) -> None:
    settings = db.scalar(
        select(TenantCollaborationSettings).where(
            TenantCollaborationSettings.tenant_id == tenant_id
        )
    )
    if not settings:
        settings = TenantCollaborationSettings(tenant_id=tenant_id)
        db.add(settings)
        db.flush()

    if not settings.workspace_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspaces are disabled for this tenant",
        )

    current_count = db.scalar(
        select(sa_func.count(Workspace.id)).where(
            Workspace.tenant_id == tenant_id,
            Workspace.is_archived == False,
        )
    ) or 0

    if current_count >= settings.max_workspaces:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workspace limit reached ({settings.max_workspaces}). Archive or delete existing workspaces.",
        )


def create_workspace(db: Session, data: WorkspaceCreate) -> Workspace:
    _get_tenant_or_404(db, data.tenant_id)
    _check_workspace_limit(db, data.tenant_id)

    slug = data.slug
    if not slug:
        slug = _generate_slug(data.name)
    slug = _make_unique_slug(db, data.tenant_id, slug)

    workspace = Workspace(
        tenant_id=data.tenant_id,
        name=data.name,
        slug=slug,
        description=data.description,
        avatar_url=data.avatar_url,
        visibility=WorkspaceVisibility(data.visibility),
        created_by=data.created_by,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    logger.info(
        "Created workspace id=%d tenant_id=%d slug=%s",
        workspace.id, workspace.tenant_id, workspace.slug,
    )
    return workspace


def list_workspaces(
    db: Session, tenant_id: int,
    include_archived: bool = False,
    skip: int = 0,
    limit: int = 100,
) -> list[Workspace]:
    _get_tenant_or_404(db, tenant_id)

    stmt = select(Workspace).where(Workspace.tenant_id == tenant_id)
    if not include_archived:
        stmt = stmt.where(Workspace.is_archived == False)
    stmt = stmt.order_by(Workspace.created_at.desc()).offset(skip).limit(limit)

    return list(db.scalars(stmt).all())


def get_workspace(db: Session, workspace_id: int, tenant_id: int) -> Workspace:
    _get_tenant_or_404(db, tenant_id)
    return _get_workspace_or_404(db, workspace_id, tenant_id)


def update_workspace(
    db: Session, workspace_id: int, tenant_id: int, data: WorkspaceUpdate,
) -> Workspace:
    workspace = _get_workspace_or_404(db, workspace_id, tenant_id)

    if workspace.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit an archived workspace. Restore it first.",
        )

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(workspace, field, value)

    db.commit()
    db.refresh(workspace)
    logger.info("Updated workspace id=%d tenant_id=%d", workspace.id, workspace.tenant_id)
    return workspace


def archive_workspace(db: Session, workspace_id: int, tenant_id: int) -> Workspace:
    workspace = _get_workspace_or_404(db, workspace_id, tenant_id)
    workspace.is_archived = True
    db.commit()
    db.refresh(workspace)
    logger.info("Archived workspace id=%d tenant_id=%d", workspace.id, workspace.tenant_id)
    return workspace


def restore_workspace(db: Session, workspace_id: int, tenant_id: int) -> Workspace:
    workspace = _get_workspace_or_404(db, workspace_id, tenant_id)
    workspace.is_archived = False
    db.commit()
    db.refresh(workspace)
    logger.info("Restored workspace id=%d tenant_id=%d", workspace.id, workspace.tenant_id)
    return workspace
