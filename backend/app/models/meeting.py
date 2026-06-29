from typing import TYPE_CHECKING, Optional
from datetime import datetime, date, time
from sqlalchemy import String, Integer, DateTime, Date, Time, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base
from app.models.mixins.tenant_mixin import TenantMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.project import Project
    from app.models.user import User
    from app.models.meeting_attendee import MeetingAttendee
    from app.models.meeting_note import MeetingNote
    from app.models.ai_meeting_summary import AIMeetingSummary


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Meeting(TenantMixin, Base):
    __tablename__ = "meetings"
    __tenant_fk__ = "tenants.id"
    __tenant_fk_ondelete__ = "CASCADE"
    __tenant_nullable__ = False

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    meeting_date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    meeting_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[MeetingStatus] = mapped_column(
        SAEnum(MeetingStatus), default=MeetingStatus.SCHEDULED
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="meetings")
    project: Mapped["Project"] = relationship(back_populates="meetings")
    creator: Mapped["User"] = relationship(back_populates="meetings")
    attendees: Mapped[list["MeetingAttendee"]] = relationship(back_populates="meeting")
    notes: Mapped[list["MeetingNote"]] = relationship(back_populates="meeting")
    ai_summary: Mapped[Optional["AIMeetingSummary"]] = relationship(back_populates="meeting", uselist=False)
