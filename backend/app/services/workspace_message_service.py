from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.workspace_message import WorkspaceMessage
from app.models.user import User
from app.schemas.workspace_message import WorkspaceMessageCreate, WorkspaceMessageUpdate
from app.repository.workspace_message_repository import list_messages_by_workspace
from app.services.workspace_membership_service import validate_workspace_member, validate_workspace_admin, validate_workspace_moderator
from app.services.audit_log_service import log_action
from app.services.phase10_notification_helper import process_mentions
from app.core.log import get_logger
from app.core.tenant import tenant_filter, TenantInfo

logger = get_logger("workspace_message_service")


def create_message(
    db: Session,
    workspace_id: int,
    data: WorkspaceMessageCreate,
    user: User,
    tenant_table_id: int | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> WorkspaceMessage:
    validate_workspace_member(db, workspace_id, user)

    if tenant_table_id is None:
        info = TenantInfo.resolve_from_db(db, org_id=user.tenant_id)
        tenant_table_id = info.tenant_table_id if info else user.tenant_id

    message = WorkspaceMessage(
        workspace_id=workspace_id,
        sender_id=user.id,
        content=data.content,
        message_type=data.message_type,
        tenant_id=tenant_table_id,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    log_action(
        db, user.id, "create", "workspace_message", message.id,
        new_value={"content": data.content, "message_type": data.message_type},
        module_name="workspace_message", action_type="create", record_id=message.id,
        ip_address=ip_address, user_agent=user_agent,
    )

    process_mentions(db, message.content, user, f"workspace {workspace_id}")

    logger.info("Message %d created in workspace %d by user %d", message.id, workspace_id, user.id)
    return message


def list_messages(
    db: Session,
    workspace_id: int,
    user: User,
    tenant_table_id: int | None = None,
):
    validate_workspace_member(db, workspace_id, user)
    if tenant_table_id is None:
        info = TenantInfo.resolve_from_db(db, org_id=user.tenant_id)
        tenant_table_id = info.tenant_table_id if info else user.tenant_id
    return list_messages_by_workspace(db, workspace_id, tenant_table_id)


def _tenant_table_id(db: Session, user: User) -> int | None:
    info = TenantInfo.resolve_from_db(db, org_id=user.tenant_id)
    return info.tenant_table_id if info else user.tenant_id


def update_message(
    db: Session,
    message_id: int,
    data: WorkspaceMessageUpdate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> WorkspaceMessage:
    tid = _tenant_table_id(db, user)
    message = db.scalar(tenant_filter(select(WorkspaceMessage), WorkspaceMessage, tid).where(WorkspaceMessage.id == message_id))
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if message.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot edit a deleted message")

    old_content = message.content
    old_message_type = message.message_type

    if message.sender_id != user.id:
        validate_workspace_admin(db, message.workspace_id, user)

    if data.content is not None:
        message.content = data.content
    if data.message_type is not None:
        message.message_type = data.message_type
    message.edited_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)

    log_action(
        db, user.id, "update", "workspace_message", message_id,
        old_value={"content": old_content, "message_type": old_message_type},
        new_value={"content": message.content, "message_type": message.message_type},
        module_name="workspace_message", action_type="update", record_id=message_id,
        ip_address=ip_address, user_agent=user_agent,
    )

    process_mentions(db, message.content, user, f"workspace {message.workspace_id}")

    logger.info("Message %d updated by user %d", message_id, user.id)
    return message


def delete_message(
    db: Session,
    message_id: int,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    tid = _tenant_table_id(db, user)
    message = db.scalar(tenant_filter(select(WorkspaceMessage), WorkspaceMessage, tid).where(WorkspaceMessage.id == message_id))
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if message.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message already deleted")

    if message.sender_id != user.id:
        validate_workspace_admin(db, message.workspace_id, user)

    old_content = message.content
    message.deleted_at = datetime.now(timezone.utc)
    db.commit()

    log_action(
        db, user.id, "delete", "workspace_message", message_id,
        old_value={"content": old_content},
        module_name="workspace_message", action_type="delete", record_id=message_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Message %d soft-deleted by user %d", message_id, user.id)
    return {"message": "Message deleted"}


def pin_message(
    db: Session,
    workspace_id: int,
    message_id: int,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> WorkspaceMessage:
    validate_workspace_moderator(db, workspace_id, user)

    tid = _tenant_table_id(db, user)
    message = db.scalar(tenant_filter(select(WorkspaceMessage), WorkspaceMessage, tid).where(
        WorkspaceMessage.id == message_id, WorkspaceMessage.workspace_id == workspace_id
    ))
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if message.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot pin a deleted message")

    message.is_pinned = True
    message.pinned_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)

    log_action(
        db, user.id, "pin", "workspace_message", message_id,
        module_name="workspace_message", action_type="pin", record_id=message_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Message %d pinned in workspace %d by user %d", message_id, workspace_id, user.id)
    return message


def unpin_message(
    db: Session,
    workspace_id: int,
    message_id: int,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> WorkspaceMessage:
    validate_workspace_moderator(db, workspace_id, user)

    tid = _tenant_table_id(db, user)
    message = db.scalar(tenant_filter(select(WorkspaceMessage), WorkspaceMessage, tid).where(
        WorkspaceMessage.id == message_id, WorkspaceMessage.workspace_id == workspace_id
    ))
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    message.is_pinned = False
    message.pinned_at = None
    db.commit()
    db.refresh(message)

    log_action(
        db, user.id, "unpin", "workspace_message", message_id,
        module_name="workspace_message", action_type="unpin", record_id=message_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Message %d unpinned in workspace %d by user %d", message_id, workspace_id, user.id)
    return message
