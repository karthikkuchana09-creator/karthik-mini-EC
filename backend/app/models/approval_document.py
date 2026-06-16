from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.approval import Approval
    from app.models.user import User


class ApprovalDocument(TenantMixin, Base):
    __tablename__ = "approval_documents"
    __tenant_fk__ = "tenants.id"
    __tenant_fk_ondelete__ = "CASCADE"
    __tenant_nullable__ = False

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    approval_id: Mapped[int] = mapped_column(Integer, ForeignKey("approvals.id", ondelete="CASCADE"), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(Text)
    file_size: Mapped[int] = mapped_column(Integer)
    mime_type: Mapped[str] = mapped_column(String(100))
    uploaded_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    document_type: Mapped[str] = mapped_column(String(50), default="attachment")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    approval: Mapped["Approval"] = relationship(back_populates="approval_documents")
    uploader: Mapped["User"] = relationship(back_populates="approval_documents")
