from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Text, ForeignKey, JSON, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class OrganizationSettings(Base):
    __tablename__ = "organization_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), unique=True)
    primary_color: Mapped[str] = mapped_column(String(7), default="#6366f1")
    secondary_color: Mapped[str] = mapped_column(String(7), default="#8b5cf6")
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    favicon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    company_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    date_format: Mapped[str] = mapped_column(String(20), default="YYYY-MM-DD")
    max_users: Mapped[int] = mapped_column(Integer, default=50)
    max_storage_gb: Mapped[int] = mapped_column(Integer, default=5)
    allowed_auth_providers: Mapped[list] = mapped_column(JSON, default=lambda: ["email"])
    feature_flags: Mapped[dict] = mapped_column(JSON, default=lambda: {})
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    organization: Mapped["Organization"] = relationship(back_populates="settings", uselist=False)
