from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class TenantCollaborationSettings(Base):
    __tablename__ = "tenant_collaboration_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), unique=True
    )
    max_workspaces: Mapped[int] = mapped_column(Integer, default=5)
    max_channels_per_workspace: Mapped[int] = mapped_column(Integer, default=10)
    max_workspace_members: Mapped[int] = mapped_column(Integer, default=50)
    max_storage_mb: Mapped[int] = mapped_column(Integer, default=500)
    workspace_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    channel_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="collaboration_settings", uselist=False)
