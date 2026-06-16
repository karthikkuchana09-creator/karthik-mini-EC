from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Text, Enum as SAEnum, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.user import User
    from app.models.workspace_member import WorkspaceMember
    from app.models.channel import Channel
    from app.models.task import Task
    from app.models.approval import Approval
    from app.models.workspace_message import WorkspaceMessage
    from app.models.channel_message import ChannelMessage


class WorkspaceVisibility(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class Workspace(TenantMixin, Base):
    __tablename__ = "workspaces"
    __tenant_fk__ = "tenants.id"
    __tenant_fk_ondelete__ = "CASCADE"
    __tenant_nullable__ = False

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    visibility: Mapped[WorkspaceVisibility] = mapped_column(
        SAEnum(WorkspaceVisibility), default=WorkspaceVisibility.PUBLIC
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE")
    )
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_workspace_tenant_slug"),
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="workspaces")
    creator: Mapped["User"] = relationship(back_populates="workspaces")
    members: Mapped[list["WorkspaceMember"]] = relationship(back_populates="workspace")
    channels: Mapped[list["Channel"]] = relationship(back_populates="workspace")
    tasks: Mapped[list["Task"]] = relationship(back_populates="workspace")
    approvals: Mapped[list["Approval"]] = relationship(back_populates="workspace")
    workspace_messages: Mapped[list["WorkspaceMessage"]] = relationship(back_populates="workspace")
    channel_messages: Mapped[list["ChannelMessage"]] = relationship(back_populates="workspace")
