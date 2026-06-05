from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import Integer, Boolean, DateTime, BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.channel import Channel
    from app.models.user import User


class ChannelMember(TenantMixin, Base):
    __tablename__ = "channel_members"
    __tenant_fk__ = "tenants.id"
    __tenant_fk_ondelete__ = "CASCADE"
    __tenant_nullable__ = False

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    channel_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("channels.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False)
    last_read_message_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True
    )

    __table_args__ = (
        UniqueConstraint("channel_id", "user_id", name="uq_channel_member"),
    )

    channel: Mapped["Channel"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="channel_memberships")
