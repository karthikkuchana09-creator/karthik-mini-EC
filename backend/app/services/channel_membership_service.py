from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.channel import Channel, ChannelType
from app.models.channel_member import ChannelMember
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole


def _get_channel_or_404(db: Session, channel_id: int) -> Channel:
    channel = db.scalar(select(Channel).where(Channel.id == channel_id))
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )
    return channel


def _get_channel_member_or_none(db: Session, channel_id: int, user_id: int) -> ChannelMember | None:
    return db.scalar(
        select(ChannelMember).where(
            ChannelMember.channel_id == channel_id,
            ChannelMember.user_id == user_id,
        )
    )


def _get_channel_member_or_404(db: Session, channel_id: int, user_id: int) -> ChannelMember:
    member = _get_channel_member_or_none(db, channel_id, user_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this channel",
        )
    return member


def _get_workspace_membership(db: Session, workspace_id: int, user_id: int) -> WorkspaceMember | None:
    return db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.is_active == True,
        )
    )


def _is_channel_moderator(db: Session, channel: Channel, user: User) -> bool:
    if channel.created_by == user.id:
        return True
    membership = _get_workspace_membership(db, channel.workspace_id, user.id)
    if membership and membership.role in (
        WorkspaceMemberRole.WORKSPACE_ADMIN,
        WorkspaceMemberRole.MODERATOR,
    ):
        return True
    return False


def _is_public_channel_member(db: Session, channel: Channel, user_id: int) -> bool:
    if channel.channel_type != ChannelType.PUBLIC:
        return False
    return _get_workspace_membership(db, channel.workspace_id, user_id) is not None


def validate_channel_member(db: Session, channel_id: int, user: User) -> ChannelMember | None:
    channel = _get_channel_or_404(db, channel_id)
    member = _get_channel_member_or_none(db, channel_id, user.id)
    if member:
        return member
    if _is_public_channel_member(db, channel, user.id):
        return None
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="User is not a member of this channel",
    )


def validate_channel_moderator(db: Session, channel_id: int, user: User) -> Channel:
    channel = _get_channel_or_404(db, channel_id)
    validate_channel_member(db, channel_id, user)
    if not _is_channel_moderator(db, channel, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Channel moderator access required",
        )
    return channel


def validate_channel_task_assignment(
    db: Session,
    channel_id: int,
    user: User,
    assignee_id: int | None,
) -> Channel:
    channel = _get_channel_or_404(db, channel_id)

    validate_channel_member(db, channel_id, user)

    if assignee_id is not None:
        assignee_member = _get_channel_member_or_none(db, channel_id, assignee_id)
        if not assignee_member and not _is_public_channel_member(db, channel, assignee_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Assignee is not a member of this channel",
            )

        if _is_channel_moderator(db, channel, user):
            return channel

        if user.role.value in ("manager", "admin", "super_admin"):
            return channel

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace admin, channel moderator, or manager can assign tasks",
        )

    return channel
