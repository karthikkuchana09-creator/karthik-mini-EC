from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Index
from datetime import datetime
from app.db.base import Base
from sqlalchemy.orm import relationship


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    description = Column(Text)
    status = Column(String(50), default="todo", index=True)
    priority = Column(String(50), index=True)
    due_date = Column(DateTime, index=True)

    created_by_id = Column(Integer, ForeignKey("users.id"), index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), index=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_tasks_assigned_to_id_status", "assigned_to_id", "status"),
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by_id],
        back_populates="created_tasks"
    )

    assignee = relationship(
        "User",
        foreign_keys=[assigned_to_id],
        back_populates="assigned_tasks"
    )

    updater = relationship(
        "User",
        foreign_keys=[updated_by],
        back_populates="updated_tasks"
    )

    documents = relationship("Document", back_populates="task")
