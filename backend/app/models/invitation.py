from sqlalchemy import String, DateTime, Enum as SAEnum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
import enum
from app.db.base import Base


class InvitationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"


class OrganizationInvitation(Base):
    __tablename__ = "organization_invitations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="employee")
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    status: Mapped[InvitationStatus] = mapped_column(SAEnum(InvitationStatus), default=InvitationStatus.pending)
    invited_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    organization: Mapped["Organization"] = relationship(back_populates="invitations")
    inviter: Mapped[Optional["User"]] = relationship(back_populates="sent_invitations", foreign_keys=[invited_by])
