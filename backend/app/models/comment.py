from sqlalchemy import Text, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from datetime import datetime
from app.db.base import Base


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    is_internal: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), index=True)

    __table_args__ = (
        Index("ix_comments_task_id_created_at", "task_id", "created_at"),
    )
