from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.user import User


class AttendeeStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    TENTATIVE = "TENTATIVE"


class MeetingAttendee(TenantMixin, Base):
    __tablename__ = "meeting_attendees"
    __tenant_fk__ = "tenants.id"
    __tenant_fk_ondelete__ = "CASCADE"
    __tenant_nullable__ = False

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[AttendeeStatus] = mapped_column(
        SAEnum(AttendeeStatus), default=AttendeeStatus.PENDING
    )
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("meeting_id", "user_id", name="uq_meeting_attendee"),
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="attendees")
    user: Mapped["User"] = relationship(back_populates="meeting_attendances")
