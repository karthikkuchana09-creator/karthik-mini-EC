from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy import func
from app.db.base import Base
from sqlalchemy.orm import relationship


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)

    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    status = Column(String(50), default="pending", index=True)
    current_level = Column(String(50), default="manager", index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_approvals_requested_by_status", "requested_by", "status"),
        Index("ix_approvals_current_level_status", "current_level", "status"),
    )

    requester = relationship("User", foreign_keys=[requested_by])
