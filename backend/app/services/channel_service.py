from typing import Optional
from sqlalchemy import select, func as sa_func
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.tenant import Tenant
from app.models.workspace import Workspace
from app.models.channel import Channel, ChannelType
from app.models.tenant_collaboration_settings import TenantCollaborationSettings
from app.schemas.channel import ChannelCreate, ChannelUpdate
from app.core.log import get_logger

logger = get_logger("channel_service")


def _get_tenant_or_404(db: Session, tenant_id: int) -> Tenant:
    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    return tenant


def _get_workspace_or_404(db: Session, workspace_id: int) -> Workspace:
    workspace = db.scalar(select(Workspace).where(Workspace.id == workspace_id))
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
    return workspace


def _get_channel_or_404(db: Session, channel_id: int) -> Channel:
    channel = db.scalar(select(Channel).where(Channel.id == channel_id))
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )
    return channel


def _check_channel_limit(db: Session, workspace_id: int) -> None:
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

    if not settings.channel_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Channels are disabled for this tenant",
        )

    current_count = db.scalar(
        select(sa_func.count(Channel.id)).where(
            Channel.workspace_id == workspace_id,
            Channel.is_archived == False,
        )
    ) or 0

    if current_count >= settings.max_channels_per_workspace:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Channel limit reached ({settings.max_channels_per_workspace}) for this workspace",
        )


def create_channel(db: Session, data: ChannelCreate) -> Channel:
    _get_tenant_or_404(db, data.tenant_id)
    workspace = _get_workspace_or_404(db, data.workspace_id)

    if workspace.tenant_id != data.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace does not belong to this tenant",
        )

    if workspace.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create channel in an archived workspace",
        )

    _check_channel_limit(db, data.workspace_id)

    channel = Channel(
        tenant_id=data.tenant_id,
        workspace_id=data.workspace_id,
        name=data.name,
        description=data.description,
        channel_type=ChannelType(data.channel_type),
        created_by=data.created_by,
    )
    db.add(channel)
    db.commit()
    db.refresh(channel)
    logger.info(
        "Created channel id=%d workspace_id=%d type=%s",
        channel.id, channel.workspace_id, data.channel_type,
    )
    return channel


def list_channels_by_workspace(
    db: Session, workspace_id: int,
    include_archived: bool = False,
) -> list[Channel]:
    _get_workspace_or_404(db, workspace_id)

    stmt = (
        select(Channel)
        .where(Channel.workspace_id == workspace_id)
        .order_by(Channel.created_at.asc())
    )
    if not include_archived:
        stmt = stmt.where(Channel.is_archived == False)

    return list(db.scalars(stmt).all())


def get_channel(db: Session, channel_id: int) -> Channel:
    return _get_channel_or_404(db, channel_id)


def update_channel(
    db: Session, channel_id: int, data: ChannelUpdate,
) -> Channel:
    channel = _get_channel_or_404(db, channel_id)

    if channel.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit an archived channel. Restore it first.",
        )

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(channel, field, value)

    db.commit()
    db.refresh(channel)
    logger.info("Updated channel id=%d", channel.id)
    return channel


def archive_channel(db: Session, channel_id: int) -> Channel:
    channel = _get_channel_or_404(db, channel_id)
    channel.is_archived = True
    db.commit()
    db.refresh(channel)
    logger.info("Archived channel id=%d", channel.id)
    return channel


def restore_channel(db: Session, channel_id: int) -> Channel:
    channel = _get_channel_or_404(db, channel_id)
    channel.is_archived = False
    db.commit()
    db.refresh(channel)
    logger.info("Restored channel id=%d", channel.id)
    return channel
