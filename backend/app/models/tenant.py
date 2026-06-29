from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant_onboarding import TenantOnboarding
    from app.models.tenant_collaboration_settings import TenantCollaborationSettings
    from app.models.tenant_collaboration_usage import TenantCollaborationUsage
    from app.models.workspace import Workspace
    from app.models.channel import Channel
    from app.models.team import Team
    from app.models.project import Project
    from app.models.meeting import Meeting


class TenantStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    TRIAL = "TRIAL"
    CANCELLED = "CANCELLED"


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    contact_email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[TenantStatus] = mapped_column(SAEnum(TenantStatus), default=TenantStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    onboarding: Mapped[Optional["TenantOnboarding"]] = relationship(back_populates="tenant", uselist=False)
    collaboration_settings: Mapped[Optional["TenantCollaborationSettings"]] = relationship(
        back_populates="tenant", uselist=False
    )
    collaboration_usage: Mapped[Optional["TenantCollaborationUsage"]] = relationship(
        back_populates="tenant", uselist=False
    )
    workspaces: Mapped[list["Workspace"]] = relationship(back_populates="tenant")
    channels: Mapped[list["Channel"]] = relationship(back_populates="tenant")
    teams: Mapped[list["Team"]] = relationship(back_populates="tenant")
    projects: Mapped[list["Project"]] = relationship(back_populates="tenant")
    meetings: Mapped[list["Meeting"]] = relationship(back_populates="tenant")
