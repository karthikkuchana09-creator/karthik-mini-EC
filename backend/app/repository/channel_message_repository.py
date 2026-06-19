from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.channel_message import ChannelMessage


def list_messages_by_channel(db: Session, channel_id: int, tenant_table_id: int | None = None):
    stmt = (
        select(ChannelMessage)
        .where(
            ChannelMessage.channel_id == channel_id,
            ChannelMessage.deleted_at.is_(None),
        )
        .order_by(ChannelMessage.created_at.desc())
    )
    if tenant_table_id is not None:
        stmt = stmt.where(ChannelMessage.tenant_id == tenant_table_id)
    return paginate(db, stmt)
