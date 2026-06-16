from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.workspace import Workspace
from app.models.channel import Channel
from app.models.task import Task
from app.models.approval import Approval


def _raise_forbidden(detail: str = "Cross-tenant access is blocked") -> None:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail,
    )


def _get_entity_or_404(db: Session, model, entity_id: int, name: str):
    entity = db.scalar(select(model).where(model.id == entity_id))
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{name} not found",
        )
    return entity


def _check_user_tenant(user: User, tenant_id: int) -> None:
    if user.tenant_id is not None and user.tenant_id != tenant_id:
        _raise_forbidden("User does not belong to this tenant")


def _check_entity_tenant(db: Session, model, entity_id: int, name: str, user_tenant_id: int) -> None:
    entity = _get_entity_or_404(db, model, entity_id, name)
    if entity.tenant_id is not None and entity.tenant_id != user_tenant_id:
        _raise_forbidden(f"{name} does not belong to this tenant")


def validate_tenant_access(
    db: Session,
    user: User,
    *,
    tenant_id: int | None = None,
    workspace_id: int | None = None,
    channel_id: int | None = None,
    task_id: int | None = None,
    approval_id: int | None = None,
) -> None:
    user_tenant_id = user.tenant_id

    if tenant_id is not None:
        _check_user_tenant(user, tenant_id)

    if user_tenant_id is None:
        return

    if workspace_id is not None:
        _check_entity_tenant(db, Workspace, workspace_id, "Workspace", user_tenant_id)

    if channel_id is not None:
        _check_entity_tenant(db, Channel, channel_id, "Channel", user_tenant_id)

    if task_id is not None:
        _check_entity_tenant(db, Task, task_id, "Task", user_tenant_id)

    if approval_id is not None:
        _check_entity_tenant(db, Approval, approval_id, "Approval", user_tenant_id)
