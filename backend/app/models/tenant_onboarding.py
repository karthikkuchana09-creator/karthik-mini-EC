from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.user import User


class OnboardingStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TenantOnboarding(Base):
    __tablename__ = "tenant_onboarding"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), unique=True)
    admin_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    onboarding_status: Mapped[OnboardingStatus] = mapped_column(SAEnum(OnboardingStatus), default=OnboardingStatus.PENDING)
    admin_created: Mapped[bool] = mapped_column(Boolean, default=False)
    default_workspace_created: Mapped[bool] = mapped_column(Boolean, default=False)
    settings_created: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    tenant: Mapped["Tenant"] = relationship(back_populates="onboarding")
    admin_user: Mapped[Optional["User"]] = relationship(back_populates="onboarding_record")
