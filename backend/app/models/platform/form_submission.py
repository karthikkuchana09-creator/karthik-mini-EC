from sqlalchemy import Integer, ForeignKey, DateTime, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin


class FormSubmission(TenantMixin, Base):
    __tablename__ = "form_submissions"
    __table_args__ = (
        Index("ix_fs_tenant_form", "tenant_id", "form_id"),
        Index("ix_fs_tenant_submitted", "tenant_id", "submitted_by"),
        Index("ix_fs_tenant_created", "tenant_id", "created_at"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("custom_forms.id"), nullable=False, index=True)
    submitted_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    form: Mapped["CustomForm"] = relationship("CustomForm", back_populates="submissions")
    submitter: Mapped["User"] = relationship("User")
