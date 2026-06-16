from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole


def _get_workspace_or_404(db: Session, workspace_id: int) -> Workspace:
    workspace = db.scalar(select(Workspace).where(Workspace.id == workspace_id))
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
    return workspace


def _get_membership_or_none(db: Session, workspace_id: int, user_id: int) -> WorkspaceMember | None:
    return db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.is_active == True,
        )
    )


def _get_membership_or_404(db: Session, workspace_id: int, user_id: int) -> WorkspaceMember:
    member = _get_membership_or_none(db, workspace_id, user_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this workspace",
        )
    return member


def validate_workspace_member(db: Session, workspace_id: int, user: User) -> WorkspaceMember:
    _get_workspace_or_404(db, workspace_id)
    return _get_membership_or_404(db, workspace_id, user.id)


def validate_workspace_admin(db: Session, workspace_id: int, user: User) -> WorkspaceMember:
    _get_workspace_or_404(db, workspace_id)
    member = _get_membership_or_404(db, workspace_id, user.id)
    if member.role != WorkspaceMemberRole.WORKSPACE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace admin access required",
        )
    return member


def validate_workspace_moderator(db: Session, workspace_id: int, user: User) -> WorkspaceMember:
    _get_workspace_or_404(db, workspace_id)
    member = _get_membership_or_404(db, workspace_id, user.id)
    if member.role not in (WorkspaceMemberRole.WORKSPACE_ADMIN, WorkspaceMemberRole.MODERATOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace moderator or admin access required",
        )
    return member


def validate_workspace_task_assignment(
    db: Session,
    workspace_id: int,
    user: User,
    assignee_id: int,
) -> WorkspaceMember:
    _get_workspace_or_404(db, workspace_id)

    member = _get_membership_or_404(db, workspace_id, user.id)

    assignee = _get_membership_or_none(db, workspace_id, assignee_id)
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assignee is not a member of this workspace",
        )

    is_workspace_admin_or_mod = member.role in (
        WorkspaceMemberRole.WORKSPACE_ADMIN,
        WorkspaceMemberRole.MODERATOR,
    )
    is_manager_or_above = user.role.value in ("manager", "admin", "super_admin")

    if not is_workspace_admin_or_mod and not is_manager_or_above:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace admin, moderator, or manager can assign tasks",
        )

    return member
