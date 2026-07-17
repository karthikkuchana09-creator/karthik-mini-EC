from sqlalchemy import String, Integer, ForeignKey, Text, DateTime, JSON, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import func
from app.db.base import Base


FIELD_TYPES = {"TEXT", "NUMBER", "DATE", "SELECT", "FILE"}


class CustomFormField(Base):
    __tablename__ = "custom_form_fields"
    __table_args__ = (
        Index("ix_cff_form_sort", "form_id", "sort_order"),
        Index("ix_cff_form_type", "form_id", "field_type"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("custom_forms.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    field_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="TEXT, NUMBER, DATE, SELECT, or FILE")
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    placeholder: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    options: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, comment="Options for SELECT type: list of {label, value} objects",
    )
    validation_rules: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, comment="JSON validation rules: min_length, max_length, min, max, pattern, etc.",
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    form: Mapped["CustomForm"] = relationship("CustomForm", back_populates="fields")
