from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from datetime import datetime
from app.db.base import Base
from sqlalchemy.orm import relationship
import enum


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

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    role = Column(Enum(UserRole), default=UserRole.employee, nullable=False)
    subscription_role = Column(Enum(SubscriptionRole), default=SubscriptionRole.member, nullable=False)

    is_active = Column(Boolean, default=True)

    google_id = Column(String(255), unique=True, nullable=True, index=True)
    avatar_url = Column(String(500), nullable=True)
    auth_provider = Column(String(50), default="email")

    created_at = Column(DateTime, default=datetime.utcnow)

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # ✅ FIXED RELATIONSHIPS
    created_tasks = relationship(
        "Task",
        foreign_keys="Task.created_by_id",
        back_populates="creator"
    )

    assigned_tasks = relationship(
        "Task",
        foreign_keys="Task.assigned_to_id",
        back_populates="assignee"
    )

    updated_tasks = relationship(
        "Task",
        foreign_keys="Task.updated_by",
        back_populates="updater"
    )

    documents = relationship("Document", back_populates="uploader")