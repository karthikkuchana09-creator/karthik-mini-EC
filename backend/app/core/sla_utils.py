"""
SLA helper utilities.

Reusable logic for SLA priority resolution, status checks, and
time calculations — extracted from the tracking and monitor services
so they can be shared across the codebase.

Usage:
    from app.core.sla_utils import resolve_sla_priority, is_sla_overdue

    priority = resolve_sla_priority(db, "task", task_id)
    if is_sla_overdue(due_time):
        ...
"""
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.approval import Approval
from app.models.sla_tracking import SLATracking
from app.core.log import get_logger

logger = get_logger("sla_utils")

VALID_MODULES = {"task", "approval"}


def resolve_entity_priority(db: Session, module_name: str, record_id: int) -> str:
    """
    Resolve the priority of an entity for SLA matching.

    For tasks, uses the task's ``priority`` field (defaults to "medium").
    For approvals, always returns "high".
    """
    if module_name == "task":
        task = db.scalar(Task.__table__.select().where(Task.id == record_id))
        if not task:
            return "medium"
        return task.priority or "medium"
    if module_name == "approval":
        return "high"
    return "medium"


def is_sla_overdue(due_time: Optional[datetime]) -> bool:
    """Check whether an SLA due time is in the past."""
    if due_time is None:
        return False
    return datetime.utcnow() > due_time


def get_sla_status(db: Session, module_name: str, record_id: int) -> Optional[str]:
    """Get the current SLA status for a module/record combination."""
    if module_name not in VALID_MODULES:
        return None
    tracking = db.scalar(
        SLATracking.__table__.select()
        .where(
            SLATracking.module_name == module_name,
            SLATracking.record_id == record_id,
        )
        .order_by(SLATracking.id.desc())
        .limit(1)
    )
    return tracking.status if tracking else None


def format_sla_due_time(due_time: Optional[datetime]) -> Optional[str]:
    """Format an SLA due time as an ISO string for API responses."""
    if due_time is None:
        return None
    return due_time.isoformat()


def remaining_seconds(due_time: Optional[datetime]) -> int:
    """
    Return the number of seconds remaining until the SLA due time.
    Returns 0 if already overdue or if due_time is None.
    """
    if due_time is None:
        return 0
    remaining = (due_time - datetime.utcnow()).total_seconds()
    return max(0, int(remaining))
