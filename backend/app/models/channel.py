from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.workspace import Workspace
    from app.models.user import User
    from app.models.channel_member import ChannelMember


class ChannelType(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"
    ANNOUNCEMENT = "ANNOUNCEMENT"
    PROJECT = "PROJECT"


class Channel(TenantMixin, Base):
    __tablename__ = "channels"
    __tenant_fk__ = "tenants.id"
    __tenant_fk_ondelete__ = "CASCADE"
    __tenant_nullable__ = False

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    channel_type: Mapped[ChannelType] = mapped_column(
        SAEnum(ChannelType), default=ChannelType.PUBLIC
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE")
    )
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="channels")
    workspace: Mapped["Workspace"] = relationship(back_populates="channels")
    creator: Mapped["User"] = relationship(back_populates="created_channels")
    members: Mapped[list["ChannelMember"]] = relationship(back_populates="channel")
