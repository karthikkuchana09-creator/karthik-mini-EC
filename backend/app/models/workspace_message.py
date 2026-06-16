from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.user import User


class WorkspaceMessage(TenantMixin, Base):
    __tablename__ = "workspace_messages"
    __tenant_fk__ = "tenants.id"
    __tenant_fk_ondelete__ = "CASCADE"
    __tenant_nullable__ = False

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(Text)
    message_type: Mapped[str] = mapped_column(String(50), default="text")
    edited_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="workspace_messages")
    sender: Mapped["User"] = relationship(back_populates="workspace_messages")
