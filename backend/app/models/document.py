from sqlalchemy import String, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    task_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tasks.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    uploader: Mapped["User"] = relationship(back_populates="documents")
    task: Mapped[Optional["Task"]] = relationship(back_populates="documents")
