from sqlalchemy import String, Integer, ForeignKey, Text, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base


class KnowledgeArticleVersion(Base):
    __tablename__ = "knowledge_article_versions"
    __table_args__ = (
        Index("ix_kv_article_version", "article_id", "version_number", unique=True),
        Index("ix_kv_created", "created_at"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    article_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_articles.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    article: Mapped["KnowledgeArticle"] = relationship("KnowledgeArticle", back_populates="versions")
    creator: Mapped["User"] = relationship("User")
