from sqlalchemy import String, DateTime, ForeignKey, Index, Text, func, event
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[Optional[int]] = mapped_column(nullable=True, index=True)
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("ix_audit_logs_entity_entity_id", "entity", "entity_id"),
        Index("ix_audit_logs_user_action", "user_id", "action"),
        Index("ix_audit_logs_timestamp_action", "timestamp", "action"),
        Index("ix_audit_logs_entity_action", "entity", "action"),
    )

    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])


@event.listens_for(AuditLog, "before_update")
def _prevent_audit_update(mapper, connection, target):
    raise RuntimeError(f"Cannot modify immutable AuditLog record #{target.id}")


@event.listens_for(AuditLog, "before_delete")
def _prevent_audit_delete(mapper, connection, target):
    raise RuntimeError(f"Cannot delete immutable AuditLog record #{target.id}")
