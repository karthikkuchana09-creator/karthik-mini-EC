from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, Index
from datetime import datetime
from app.db.base import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)

    task_id = Column(Integer, ForeignKey("tasks.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    content = Column(Text, nullable=False)

    is_internal = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_comments_task_id_created_at", "task_id", "created_at"),
    )
