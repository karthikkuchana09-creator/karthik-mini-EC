from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import Integer, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class TenantCollaborationUsage(Base):
    __tablename__ = "tenant_collaboration_usage"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), unique=True
    )
    workspace_count: Mapped[int] = mapped_column(Integer, default=0)
    channel_count: Mapped[int] = mapped_column(Integer, default=0)
    member_count: Mapped[int] = mapped_column(Integer, default=0)
    storage_used_mb: Mapped[float] = mapped_column(Float, default=0.0)
    last_calculated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="collaboration_usage", uselist=False)
