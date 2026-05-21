from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy import func
from app.db.base import Base


class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    approval_id = Column(Integer, ForeignKey("approvals.id"), index=True)
    action_by = Column(Integer, ForeignKey("users.id"))

    action = Column(String(50))
    comment = Column(Text)

    created_at = Column(DateTime, default=func.now())
