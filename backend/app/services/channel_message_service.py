from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.channel_message import ChannelMessage
from app.models.user import User
from app.schemas.channel_message import ChannelMessageCreate, ChannelMessageUpdate
from app.repository.channel_message_repository import list_messages_by_channel
from app.services.channel_membership_service import validate_channel_member, validate_channel_moderator
from app.services.audit_log_service import log_action
from app.services.phase10_notification_helper import process_mentions
from app.core.log import get_logger

logger = get_logger("channel_message_service")


def create_message(
    db: Session,
    channel_id: int,
    data: ChannelMessageCreate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> ChannelMessage:
    validate_channel_member(db, channel_id, user)

    message = ChannelMessage(
        channel_id=channel_id,
        sender_id=user.id,
        content=data.content,
        message_type=data.message_type,
        tenant_id=getattr(user, "tenant_id", None),
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    log_action(
        db, user.id, "create", "channel_message", message.id,
        new_value={"content": data.content, "message_type": data.message_type},
        module_name="channel_message", action_type="create", record_id=message.id,
        ip_address=ip_address, user_agent=user_agent,
    )

    process_mentions(db, message.content, user, f"channel {channel_id}")

    logger.info("Message %d created in channel %d by user %d", message.id, channel_id, user.id)
    return message


def list_messages(
    db: Session,
    channel_id: int,
    user: User,
):
    validate_channel_member(db, channel_id, user)
    return list_messages_by_channel(db, channel_id)


def update_message(
    db: Session,
    message_id: int,
    data: ChannelMessageUpdate,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> ChannelMessage:
    message = db.scalar(select(ChannelMessage).where(ChannelMessage.id == message_id))
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if message.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot edit a deleted message")

    old_content = message.content
    old_message_type = message.message_type

    if message.sender_id != user.id:
        validate_channel_moderator(db, message.channel_id, user)

    if data.content is not None:
        message.content = data.content
    if data.message_type is not None:
        message.message_type = data.message_type
    message.edited_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)

    log_action(
        db, user.id, "update", "channel_message", message_id,
        old_value={"content": old_content, "message_type": old_message_type},
        new_value={"content": message.content, "message_type": message.message_type},
        module_name="channel_message", action_type="update", record_id=message_id,
        ip_address=ip_address, user_agent=user_agent,
    )

    process_mentions(db, message.content, user, f"channel {message.channel_id}")

    logger.info("Message %d updated by user %d", message_id, user.id)
    return message


def delete_message(
    db: Session,
    message_id: int,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    message = db.scalar(select(ChannelMessage).where(ChannelMessage.id == message_id))
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if message.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message already deleted")

    if message.sender_id != user.id:
        validate_channel_moderator(db, message.channel_id, user)

    old_content = message.content
    message.deleted_at = datetime.now(timezone.utc)
    db.commit()

    log_action(
        db, user.id, "delete", "channel_message", message_id,
        old_value={"content": old_content},
        module_name="channel_message", action_type="delete", record_id=message_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Message %d soft-deleted by user %d", message_id, user.id)
    return {"message": "Message deleted"}
