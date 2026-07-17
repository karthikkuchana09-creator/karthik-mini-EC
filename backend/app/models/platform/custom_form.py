from sqlalchemy import String, Integer, ForeignKey, Text, DateTime, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, Optional
from datetime import datetime

if TYPE_CHECKING:
    from app.models.user import User
from sqlalchemy import func
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin


class CustomForm(TenantMixin, Base):
    __tablename__ = "custom_forms"
    __table_args__ = (
        Index("ix_cf_tenant_status", "tenant_id", "status"),
        Index("ix_cf_tenant_created", "tenant_id", "created_at"),
        Index("ix_cf_creator", "created_by"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    fields_config: Mapped[dict] = mapped_column(JSON, default=list)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    creator: Mapped["User"] = relationship("User", back_populates="created_forms")
    submissions: Mapped[list["FormSubmission"]] = relationship("FormSubmission", back_populates="form")
    fields: Mapped[list["CustomFormField"]] = relationship("CustomFormField", back_populates="form", order_by="CustomFormField.sort_order")
