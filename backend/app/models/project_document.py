from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class DocumentType(str, enum.Enum):
    REQUIREMENT = "REQUIREMENT"
    DESIGN = "DESIGN"
    TEST = "TEST"
    RELEASE = "RELEASE"
    OTHER = "OTHER"


class ProjectDocument(TenantMixin, Base):
    __tablename__ = "project_documents"
    __tenant_fk__ = "tenants.id"
    __tenant_fk_ondelete__ = "CASCADE"
    __tenant_nullable__ = False

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(Text)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(100), default="application/octet-stream")
    document_type: Mapped[DocumentType] = mapped_column(
        SAEnum(DocumentType), default=DocumentType.OTHER
    )
    uploaded_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="documents")
    uploader: Mapped[Optional["User"]] = relationship(back_populates="project_documents")
