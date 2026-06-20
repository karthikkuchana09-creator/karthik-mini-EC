from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.channel import Channel, ChannelType
from app.models.channel_member import ChannelMember
from app.models.workspace_member import WorkspaceMember
from app.models.user import User
from app.core.log import get_logger

logger = get_logger("channel_member_service")


def _get_channel_or_404(db: Session, channel_id: int) -> Channel:
    channel = db.scalar(select(Channel).where(Channel.id == channel_id))
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )
    return channel


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def _validate_tenant_access(channel: Channel, user: User) -> None:
    if user.tenant_id is not None and user.tenant_id != channel.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-tenant access is blocked",
        )


def join_channel(db: Session, channel_id: int, user_id: int) -> ChannelMember:
    channel = _get_channel_or_404(db, channel_id)
    user = _get_user_or_404(db, user_id)

    if channel.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot join an archived channel",
        )

    _validate_tenant_access(channel, user)

    if channel.channel_type == ChannelType.PRIVATE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot join a private channel directly. Contact a channel admin.",
        )

    existing = db.scalar(
        select(ChannelMember).where(
            ChannelMember.channel_id == channel_id,
            ChannelMember.user_id == user_id,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this channel",
        )

    member = ChannelMember(
        channel_id=channel_id,
        user_id=user_id,
        tenant_id=channel.tenant_id,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    logger.info(
        "User %d joined channel %d", user_id, channel_id,
    )
    return member


def list_channel_members(db: Session, channel_id: int) -> list[ChannelMember]:
    channel = _get_channel_or_404(db, channel_id)
    explicit = db.scalars(
        select(ChannelMember)
        .where(ChannelMember.channel_id == channel_id)
        .options(joinedload(ChannelMember.user))
    ).all()
    if channel.channel_type == ChannelType.PUBLIC:
        explicit_user_ids = {m.user_id for m in explicit}
        q = select(User).join(WorkspaceMember, WorkspaceMember.user_id == User.id).where(
            WorkspaceMember.workspace_id == channel.workspace_id,
            WorkspaceMember.is_active == True,
        )
        if explicit_user_ids:
            q = q.where(User.id.notin_(explicit_user_ids))
        wm_users = db.scalars(q).all()
        for u in wm_users:
            cm = ChannelMember(id=-(u.id), channel_id=channel_id, user_id=u.id, tenant_id=channel.tenant_id, joined_at=datetime.now(timezone.utc), is_muted=False)
            cm.user = u
            explicit.append(cm)
    return list(explicit)


def leave_channel(db: Session, channel_id: int, user_id: int) -> None:
    channel = _get_channel_or_404(db, channel_id)
    user = _get_user_or_404(db, user_id)
    _validate_tenant_access(channel, user)

    member = db.scalar(
        select(ChannelMember).where(
            ChannelMember.channel_id == channel_id,
            ChannelMember.user_id == user_id,
        )
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this channel",
        )

    db.delete(member)
    db.commit()
    logger.info("User %d left channel %d", user_id, channel_id)
