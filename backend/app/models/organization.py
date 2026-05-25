from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Text, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base

class SubscriptionPlanEnum(str, enum.Enum):
    free = "free"
    starter = "starter"
    business = "business"
    enterprise = "enterprise"

SubscriptionPlan = SubscriptionPlanEnum

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    logo: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    subscription_plan: Mapped[SubscriptionPlanEnum] = mapped_column(SAEnum(SubscriptionPlanEnum), default=SubscriptionPlanEnum.free)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suspended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    settings: Mapped[Optional["OrganizationSettings"]] = relationship(back_populates="organization", uselist=False)
    invitations: Mapped[list["OrganizationInvitation"]] = relationship(back_populates="organization")
