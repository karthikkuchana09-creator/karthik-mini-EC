from sqlalchemy import String, Integer, ForeignKey, Text, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.platform.knowledge_category import KnowledgeCategory


class KnowledgeArticle(TenantMixin, Base):
    __tablename__ = "knowledge_articles"
    __table_args__ = (
        Index("ix_knowledge_articles_tenant_status", "tenant_id", "status"),
        Index("ix_knowledge_articles_tenant_created", "tenant_id", "created_at"),
        Index("ix_knowledge_articles_tenant_category", "tenant_id", "category_id"),
        Index("ix_knowledge_articles_author", "author_id"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("knowledge_categories.id"), nullable=True, index=True)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    category: Mapped[Optional["KnowledgeCategory"]] = relationship("KnowledgeCategory", back_populates="articles")
    author: Mapped["User"] = relationship("User")
    versions: Mapped[list["KnowledgeArticleVersion"]] = relationship(
        "KnowledgeArticleVersion", back_populates="article",
        order_by="KnowledgeArticleVersion.version_number.desc()",
    )
