from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base import Base

class OrganizationSettings(Base):
    __tablename__ = "organization_settings"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False)
    primary_color = Column(String(7), default="#6366f1")
    secondary_color = Column(String(7), default="#8b5cf6")
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    company_address = Column(Text, nullable=True)
    timezone = Column(String(50), default="UTC")
    date_format = Column(String(20), default="YYYY-MM-DD")
    max_users = Column(Integer, default=50)
    max_storage_gb = Column(Integer, default=5)
    allowed_auth_providers = Column(JSON, default=lambda: ["email"])
    feature_flags = Column(JSON, default=lambda: {})
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", backref="settings", uselist=False)
