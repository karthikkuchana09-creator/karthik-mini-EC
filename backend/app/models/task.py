from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="todo", index=True)
    priority: Mapped[Optional[str]] = mapped_column(String(50), index=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, index=True)

    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    assigned_to_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    updated_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_tasks_assigned_to_id_status", "assigned_to_id", "status"),
    )

    creator: Mapped["User"] = relationship(
        "User",
        foreign_keys=[created_by_id],
        back_populates="created_tasks"
    )

    assignee: Mapped["User"] = relationship(
        "User",
        foreign_keys=[assigned_to_id],
        back_populates="assigned_tasks"
    )

    updater: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[updated_by],
        back_populates="updated_tasks"
    )

    documents: Mapped[list["Document"]] = relationship("Document", back_populates="task")
