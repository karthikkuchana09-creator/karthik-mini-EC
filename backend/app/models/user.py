from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import enum


if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.document import Document
    from app.models.refresh_token import RefreshToken
    from app.models.password_reset_token import PasswordResetToken
    from app.models.organization import OrganizationInvitation
    from app.models.sla_rule import SLARule
    from app.models.notification_preference import NotificationPreference


class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    employee = "employee"
    user = "user"

class SubscriptionRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"
    guest = "guest"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))

    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.employee)
    subscription_role: Mapped[SubscriptionRole] = mapped_column(Enum(SubscriptionRole), default=SubscriptionRole.member)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(50), default="email")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        onupdate=func.now()
    )

    created_tasks: Mapped[list["Task"]] = relationship(
        "Task",
        foreign_keys="Task.created_by_id",
        back_populates="creator"
    )

    assigned_tasks: Mapped[list["Task"]] = relationship(
        "Task",
        foreign_keys="Task.assigned_to_id",
        back_populates="assignee"
    )

    updated_tasks: Mapped[list["Task"]] = relationship(
        "Task",
        foreign_keys="Task.updated_by",
        back_populates="updater"
    )

    documents: Mapped[list["Document"]] = relationship("Document", back_populates="uploader")

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user")
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(back_populates="user")
    sent_invitations: Mapped[list["OrganizationInvitation"]] = relationship(back_populates="inviter")

    sla_rules: Mapped[list["SLARule"]] = relationship("SLARule", back_populates="creator")

    notification_preferences: Mapped[Optional["NotificationPreference"]] = relationship(
        "NotificationPreference", back_populates="user", uselist=False
    )