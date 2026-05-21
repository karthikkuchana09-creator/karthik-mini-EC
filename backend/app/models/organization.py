from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base

class SubscriptionPlanEnum(str, enum.Enum):
    free = "free"
    starter = "starter"
    business = "business"
    enterprise = "enterprise"

SubscriptionPlan = SubscriptionPlanEnum

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    logo = Column(String(500), nullable=True)
    subscription_plan = Column(SAEnum(SubscriptionPlanEnum), default=SubscriptionPlanEnum.free, nullable=False)
    is_active = Column(Boolean, default=True)
    metadata_json = Column(Text, nullable=True)
    suspended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
