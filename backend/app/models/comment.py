from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.db.base import Base

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)

    task_id = Column(Integer, ForeignKey("tasks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    content = Column(Text, nullable=False)

    # 🔥 important feature
    is_internal = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)