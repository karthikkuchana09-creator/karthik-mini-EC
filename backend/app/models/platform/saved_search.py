from sqlalchemy import String, Integer, ForeignKey, DateTime, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin


class SavedSearch(TenantMixin, Base):
    __tablename__ = "saved_searches"
    __table_args__ = (
        Index("ix_ss_tenant_user", "tenant_id", "user_id"),
        Index("ix_ss_tenant_created", "tenant_id", "created_at"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    query: Mapped[dict] = mapped_column(JSON, nullable=False, comment="Serialized search parameters: q, entity_types, filters, etc.")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
