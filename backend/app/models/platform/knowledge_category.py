from sqlalchemy import String, Integer, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin


class KnowledgeCategory(TenantMixin, Base):
    __tablename__ = "knowledge_categories"
    __table_args__ = (
        Index("ix_kc_tenant_name", "tenant_id", "name"),
        Index("ix_kc_tenant_sort", "tenant_id", "sort_order"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("knowledge_categories.id"), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    parent: Mapped[Optional["KnowledgeCategory"]] = relationship("KnowledgeCategory", remote_side="KnowledgeCategory.id", back_populates="children")
    children: Mapped[list["KnowledgeCategory"]] = relationship("KnowledgeCategory", back_populates="parent")
    articles: Mapped[list["KnowledgeArticle"]] = relationship("KnowledgeArticle", back_populates="category")
