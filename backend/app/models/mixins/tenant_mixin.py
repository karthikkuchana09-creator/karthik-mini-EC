from typing import Optional
from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import declared_attr, Mapped, mapped_column


class TenantMixin:
    __tenant_fk__: str = "tenants.id"
    __tenant_fk_ondelete__: str = "CASCADE"
    __tenant_nullable__: bool = False

    @declared_attr
    def tenant_id(cls) -> Mapped[int | None]:
        fk = getattr(cls, "__tenant_fk__", None)
        nullable = getattr(cls, "__tenant_nullable__", False)
        ondelete = getattr(cls, "__tenant_fk_ondelete__", "CASCADE")
        if fk:
            return mapped_column(
                Integer, ForeignKey(fk, ondelete=ondelete),
                nullable=nullable, index=True,
            )
        return mapped_column(Integer, nullable=nullable, index=True)
