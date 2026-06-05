from typing import Optional
from sqlalchemy import select, func as sa_func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole
from app.models.user import User
from app.models.tenant_collaboration_settings import TenantCollaborationSettings
from app.schemas.workspace_member import WorkspaceMemberAddRequest, WorkspaceMemberRoleUpdate
from app.core.log import get_logger

logger = get_logger("workspace_member_service")


def _get_workspace_or_404(db: Session, workspace_id: int) -> Workspace:
    workspace = db.scalar(select(Workspace).where(Workspace.id == workspace_id))
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
    return workspace


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def _validate_user_tenant(db: Session, user_id: int, workspace: Workspace) -> User:
    user = _get_user_or_404(db, user_id)
    if user.tenant_id is not None and user.tenant_id != workspace.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not belong to the same tenant as this workspace",
        )
    return user


def _check_member_limit(db: Session, workspace_id: int) -> None:
    workspace = db.scalar(select(Workspace).where(Workspace.id == workspace_id))
    if not workspace:
        return

    settings = db.scalar(
        select(TenantCollaborationSettings).where(
            TenantCollaborationSettings.tenant_id == workspace.tenant_id
        )
    )
    if not settings:
        return

    current_count = db.scalar(
        select(sa_func.count(WorkspaceMember.id)).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.is_active == True,
        )
    ) or 0

    if current_count >= settings.max_workspace_members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workspace member limit reached ({settings.max_workspace_members})",
        )


def add_member(
    db: Session, workspace_id: int, data: WorkspaceMemberAddRequest,
) -> WorkspaceMember:
    workspace = _get_workspace_or_404(db, workspace_id)
    _validate_user_tenant(db, data.user_id, workspace)

    existing = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == data.user_id,
        )
    )
    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already a member of this workspace",
            )
        existing.is_active = True
        existing.role = WorkspaceMemberRole(data.role)
        db.commit()
        db.refresh(existing)
        logger.info(
            "Reactivated workspace member workspace_id=%d user_id=%d",
            workspace_id, data.user_id,
        )
        return existing

    _check_member_limit(db, workspace_id)

    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=data.user_id,
        role=WorkspaceMemberRole(data.role),
        tenant_id=workspace.tenant_id,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    logger.info(
        "Added workspace member workspace_id=%d user_id=%d role=%s",
        workspace_id, data.user_id, data.role,
    )
    return member


def list_members(
    db: Session, workspace_id: int,
    include_inactive: bool = False,
) -> list[WorkspaceMember]:
    _get_workspace_or_404(db, workspace_id)

    stmt = (
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .order_by(WorkspaceMember.joined_at.asc())
    )
    if not include_inactive:
        stmt = stmt.where(WorkspaceMember.is_active == True)

    return list(db.scalars(stmt).all())


def update_member_role(
    db: Session, workspace_id: int, user_id: int, data: WorkspaceMemberRoleUpdate,
) -> WorkspaceMember:
    workspace = _get_workspace_or_404(db, workspace_id)
    _validate_user_tenant(db, user_id, workspace)

    member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this workspace",
        )

    member.role = WorkspaceMemberRole(data.role)
    db.commit()
    db.refresh(member)
    logger.info(
        "Updated workspace member role workspace_id=%d user_id=%d role=%s",
        workspace_id, user_id, data.role,
    )
    return member


def remove_member(
    db: Session, workspace_id: int, user_id: int,
) -> None:
    workspace = _get_workspace_or_404(db, workspace_id)

    member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this workspace",
        )

    db.delete(member)
    db.commit()
    logger.info(
        "Removed workspace member workspace_id=%d user_id=%d",
        workspace_id, user_id,
    )
