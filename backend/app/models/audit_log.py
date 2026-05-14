from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, func
from app.db.base import Base
from sqlalchemy.orm import relationship


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    entity = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    timestamp = Column(DateTime, default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("ix_audit_logs_entity_entity_id", "entity", "entity_id"),
    )

    user = relationship("User", foreign_keys=[user_id])
