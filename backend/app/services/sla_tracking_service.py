from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, and_
from sqlalchemy.orm import Session, joinedload
from fastapi_pagination.ext.sqlalchemy import paginate

from app.models.sla_tracking import SLATracking
from app.models.sla_rule import SLARule
from app.models.task import Task
from app.models.approval import Approval
from app.schemas.sla_tracking import SLATrackingComplete, SLATrackingFilter
from app.core.pagination import QueryBuilder
from app.core.log import get_logger
from app.services.audit_log_service import log_action

logger = get_logger("sla_tracking_service")

VALID_MODULES = {"task", "approval"}


def _find_matching_sla_rule(db: Session, module_name: str, priority: str) -> SLARule:
    rule = db.scalar(
        select(SLARule).where(
            and_(
                SLARule.module_name == module_name,
                SLARule.priority == priority,
                SLARule.is_active.is_(True),
            )
        )
    )
    if not rule:
        raise HTTPException(
            404,
            f"No active SLA rule found for module='{module_name}' priority='{priority}'",
        )
    return rule


def _resolve_priority(db: Session, module_name: str, record_id: int) -> str:
    if module_name == "task":
        task = db.scalar(select(Task).where(Task.id == record_id))
        if not task:
            raise HTTPException(404, "Task not found")
        return task.priority or "medium"
    elif module_name == "approval":
        approval = db.scalar(select(Approval).where(Approval.id == record_id))
        if not approval:
            raise HTTPException(404, "Approval not found")
        return "high"
    raise HTTPException(400, f"Unsupported module: {module_name}")


def _check_existing_active(db: Session, module_name: str, record_id: int):
    existing = db.scalar(
        select(SLATracking).where(
            and_(
                SLATracking.module_name == module_name,
                SLATracking.record_id == record_id,
                SLATracking.status == "active",
            )
        )
    )
    if existing:
        raise HTTPException(409, f"Active SLA tracking already exists for this {module_name}")


def _auto_breach_overdue(db: Session):
    now = datetime.utcnow()
    overdue = db.scalars(
        select(SLATracking).where(
            and_(
                SLATracking.status == "active",
                SLATracking.due_time < now,
            )
        )
    ).all()

    for tracking in overdue:
        tracking.status = "breached"
        tracking.breach_reason = "Auto-breached: exceeded SLA due time"
        logger.info("SLA tracking id=%d auto-breached (due=%s)", tracking.id, tracking.due_time)

    if overdue:
        db.commit()
        for tracking in overdue:
            log_action(
                db, None, "breach", "sla", tracking.id,
                new_value={"module_name": tracking.module_name, "record_id": tracking.record_id, "reason": tracking.breach_reason},
                module_name="sla", action_type="breach", record_id=tracking.id,
            )


def start_sla_tracking(db: Session, module_name: str, record_id: int) -> SLATracking:
    if module_name not in VALID_MODULES:
        raise HTTPException(400, f"Invalid module: {module_name}. Must be one of {VALID_MODULES}")

    _check_existing_active(db, module_name, record_id)
    priority = _resolve_priority(db, module_name, record_id)
    rule = _find_matching_sla_rule(db, module_name, priority)

    start_time = datetime.utcnow()
    due_time = start_time + timedelta(hours=rule.allowed_hours)

    tracking = SLATracking(
        module_name=module_name,
        record_id=record_id,
        sla_rule_id=rule.id,
        start_time=start_time,
        due_time=due_time,
        status="active",
    )

    db.add(tracking)
    db.commit()
    db.refresh(tracking)

    log_action(
        db, None, "start", "sla", tracking.id,
        new_value={"module_name": module_name, "record_id": record_id, "due_time": due_time.isoformat()},
        module_name="sla", action_type="start", record_id=tracking.id,
    )

    logger.info(
        "SLA tracking started id=%d module=%s record_id=%d due=%s",
        tracking.id, module_name, record_id, due_time,
    )
    return tracking


def complete_sla_tracking(
    db: Session, tracking_id: int, body: SLATrackingComplete | None = None
) -> SLATracking:
    tracking = db.scalar(select(SLATracking).where(SLATracking.id == tracking_id))
    if not tracking:
        raise HTTPException(404, "SLA tracking record not found")

    if tracking.status == "completed":
        raise HTTPException(400, "SLA tracking already completed")

    tracking.status = "completed"
    tracking.completed_time = datetime.utcnow()
    if body and body.breach_reason:
        tracking.breach_reason = body.breach_reason

    db.commit()
    db.refresh(tracking)

    log_action(
        db, None, "complete", "sla", tracking_id,
        new_value={"status": "completed", "breach_reason": getattr(tracking, "breach_reason", None)},
        module_name="sla", action_type="complete", record_id=tracking_id,
    )

    logger.info("SLA tracking id=%d completed", tracking_id)
    return tracking


def _list_slas_by_status(db: Session, status: str, filters: SLATrackingFilter):
    query = (
        select(SLATracking)
        .options(joinedload(SLATracking.sla_rule))
        .where(SLATracking.status == status)
    )
    return (
        QueryBuilder(db, SLATracking, query)
        .search(filters.q, [SLATracking.module_name, SLATracking.breach_reason])
        .filter_exact(
            module_name=filters.module_name,
            sla_rule_id=filters.sla_rule_id,
            record_id=filters.record_id,
        )
        .date_range(SLATracking.start_time, filters.from_date, filters.to_date)
        .sort(filters.sort_by, filters.sort_order, [
            "start_time", "due_time", "module_name", "status",
            "created_at", "updated_at",
        ])
        .paginate(filters.page, filters.size)
    )


def get_active_slas(db: Session, filters: Optional[SLATrackingFilter] = None):
    _auto_breach_overdue(db)
    if filters is None:
        filters = SLATrackingFilter()
    return _list_slas_by_status(db, "active", filters)


def get_breached_slas(db: Session, filters: Optional[SLATrackingFilter] = None):
    _auto_breach_overdue(db)
    if filters is None:
        filters = SLATrackingFilter()
    return _list_slas_by_status(db, "breached", filters)


def get_sla_by_record(db: Session, module_name: str, record_id: int) -> SLATracking:
    if module_name not in VALID_MODULES:
        raise HTTPException(400, f"Invalid module: {module_name}")

    tracking = db.scalar(
        select(SLATracking)
        .options(joinedload(SLATracking.sla_rule))
        .where(
            and_(
                SLATracking.module_name == module_name,
                SLATracking.record_id == record_id,
            )
        )
        .order_by(SLATracking.id.desc())
    )

    if not tracking:
        raise HTTPException(404, f"SLA tracking record not found for {module_name} id={record_id}")

    if tracking.status == "active":
        _auto_breach_overdue(db)
        db.refresh(tracking)

    return tracking
