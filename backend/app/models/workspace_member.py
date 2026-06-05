from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import Integer, Boolean, DateTime, Enum as SAEnum, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.user import User


class WorkspaceMemberRole(str, enum.Enum):
    WORKSPACE_ADMIN = "WORKSPACE_ADMIN"
    MODERATOR = "MODERATOR"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


class WorkspaceMember(TenantMixin, Base):
    __tablename__ = "workspace_members"
    __tenant_fk__ = "tenants.id"
    __tenant_fk_ondelete__ = "CASCADE"
    __tenant_nullable__ = False

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[WorkspaceMemberRole] = mapped_column(
        SAEnum(WorkspaceMemberRole), default=WorkspaceMemberRole.MEMBER
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint(
            "workspace_id", "user_id", name="uq_workspace_member"
        ),
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="workspace_memberships")
