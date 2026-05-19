from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, Text, func, event
from app.db.base import Base
from sqlalchemy.orm import relationship


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    entity = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("ix_audit_logs_entity_entity_id", "entity", "entity_id"),
        Index("ix_audit_logs_user_action", "user_id", "action"),
        Index("ix_audit_logs_timestamp_action", "timestamp", "action"),
        Index("ix_audit_logs_entity_action", "entity", "action"),
    )

    user = relationship("User", foreign_keys=[user_id])


@event.listens_for(AuditLog, "before_update")
def _prevent_audit_update(mapper, connection, target):
    raise RuntimeError(f"Cannot modify immutable AuditLog record #{target.id}")


@event.listens_for(AuditLog, "before_delete")
def _prevent_audit_delete(mapper, connection, target):
    raise RuntimeError(f"Cannot delete immutable AuditLog record #{target.id}")
