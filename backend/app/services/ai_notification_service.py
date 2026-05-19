import asyncio
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app.models.notification import Notification, NotificationType
from app.models.task import Task
from app.models.approval import Approval
from app.models.user import User
from app.core.log import get_logger
from app.core.config import settings
from app.services.notification_service import create_notification
from app.websocket.manager import manager

logger = get_logger("ai_notification")

CHECK_INTERVAL = 60
DEDUP_TTL = timedelta(hours=6)

_dedup: set[tuple[str, int]] = set()
_dedup_timestamps: dict[tuple[str, int], datetime] = {}


def _is_duplicate(key: tuple[str, int]) -> bool:
    now = datetime.utcnow()
    if key in _dedup:
        age = now - _dedup_timestamps.get(key, now)
        if age < DEDUP_TTL:
            return True
        _dedup.discard(key)
        _dedup_timestamps.pop(key, None)
    _dedup.add(key)
    _dedup_timestamps[key] = now
    return False


async def _notify_users(
    db: Session,
    user_ids: list[int],
    message: str,
    trigger_type: str,
    entity_id: int,
) -> None:
    for uid in user_ids:
        key = (trigger_type, entity_id)
        if _is_duplicate(key):
            continue
        create_notification(db, uid, message, NotificationType.ai_alert)


def _get_manager_ids(db: Session) -> list[int]:
    rows = db.query(User.id).filter(
        User.is_active == True,
        User.role.in_(["admin", "manager"]),
    ).all()
    return [r[0] for r in rows]


def _get_admin_ids(db: Session) -> list[int]:
    rows = db.query(User.id).filter(
        User.is_active == True,
        User.role == "admin",
    ).all()
    return [r[0] for r in rows]


# ── Trigger 1: Task delay risk ──────────────────────────────────────

def _check_delay_risk(db: Session) -> list[dict]:
    now = datetime.utcnow()
    threshold_days = 2
    results = []

    tasks = db.query(Task).options(joinedload(Task.assignee)).filter(
        Task.status != "done",
        Task.due_date.isnot(None),
        Task.due_date <= now + timedelta(days=threshold_days),
        Task.due_date >= now,
    ).all()

    for t in tasks:
        remaining = (t.due_date - now).days
        assignee_id = t.assigned_to_id
        if not assignee_id:
            continue

        name = t.assignee.name if t.assignee else "Unassigned"
        msg = f"Task '{t.title}' due in {remaining}d — may miss deadline"
        results.append({
            "user_ids": [assignee_id],
            "message": msg,
            "trigger_type": "delay_risk",
            "entity_id": t.id,
        })

        if remaining <= 1:
            manager_ids = _get_manager_ids(db)
            mgr_msg = f"Task '{t.title}' (assigned to {name}) is due tomorrow — at risk of delay"
            for mid in manager_ids:
                if mid != assignee_id:
                    results.append({
                        "user_ids": [mid],
                        "message": mgr_msg,
                        "trigger_type": "delay_risk_mgr",
                        "entity_id": t.id,
                    })

    return results


# ── Trigger 2: Employee overloaded ──────────────────────────────────

def _check_overloaded(db: Session) -> list[dict]:
    now = datetime.utcnow()
    workload_high = 5
    workload_critical = 10
    results = []

    rows = db.query(
        Task.assigned_to_id,
        func.count(Task.id).label("cnt"),
    ).filter(
        Task.assigned_to_id.isnot(None),
        Task.status != "done",
    ).group_by(Task.assigned_to_id).having(
        func.count(Task.id) >= workload_high,
    ).all()

    if not rows:
        return results

    uids = [r[0] for r in rows]
    users_map = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(uids)).all()
    }

    manager_ids = _get_manager_ids(db)

    for uid, cnt in rows:
        user = users_map.get(uid)
        name = user.name or user.email if user else f"User #{uid}"
        is_critical = cnt >= workload_critical

        msg = f"You have {cnt} active tasks — {'workload is critical' if is_critical else 'workload is high'}"
        results.append({
            "user_ids": [uid],
            "message": msg,
            "trigger_type": "overloaded",
            "entity_id": uid,
        })

        sev = "critically overloaded" if is_critical else "overloaded"
        mgr_msg = f"Employee {name} is {sev} with {cnt} active tasks"
        for mid in manager_ids:
            if mid != uid:
                results.append({
                    "user_ids": [mid],
                    "message": mgr_msg,
                    "trigger_type": "overloaded_mgr",
                    "entity_id": uid,
                })

    return results


# ── Trigger 3: Approval pending too long ────────────────────────────

def _check_delayed_approvals(db: Session) -> list[dict]:
    now = datetime.utcnow()
    delay_hours = 48
    results = []

    delayed = db.query(Approval).options(joinedload(Approval.requester)).filter(
        Approval.status == "pending",
        Approval.created_at < now - timedelta(hours=delay_hours),
    ).all()

    for a in delayed:
        wait_hours = int((now - a.created_at).total_seconds() / 3600)
        requester_id = a.requested_by
        requester_name = a.requester.name if a.requester else "A user"

        # notify the requester
        msg = f"Approval '{a.title}' has been pending for {wait_hours}h"
        if requester_id:
            results.append({
                "user_ids": [requester_id],
                "message": msg,
                "trigger_type": "delayed_approval",
                "entity_id": a.id,
            })

        # notify managers/admins if > 72h
        if wait_hours >= 72:
            manager_ids = _get_manager_ids(db)
            mgr_msg = f"Approval '{a.title}' by {requester_name} has been waiting {wait_hours}h — consider escalation"
            for mid in manager_ids:
                if mid != requester_id:
                    results.append({
                        "user_ids": [mid],
                        "message": mgr_msg,
                        "trigger_type": "delayed_approval_mgr",
                        "entity_id": a.id,
                    })

    return results


# ── Trigger 4: High priority task ignored ───────────────────────────

def _check_ignored_high_priority(db: Session) -> list[dict]:
    now = datetime.utcnow()
    ignore_hours = 24
    results = []

    tasks = db.query(Task).options(joinedload(Task.assignee)).filter(
        Task.priority == "high",
        Task.status.in_(["todo", "in_progress"]),
        Task.updated_at < now - timedelta(hours=ignore_hours),
    ).all()

    for t in tasks:
        stalled_hours = int((now - t.updated_at).total_seconds() / 3600)
        assignee_id = t.assigned_to_id

        if assignee_id:
            name = t.assignee.name if t.assignee else "Unassigned"
            msg = f"High priority task '{t.title}' has no updates in {stalled_hours}h"
            results.append({
                "user_ids": [assignee_id],
                "message": msg,
                "trigger_type": "ignored_high_priority",
                "entity_id": t.id,
            })

            manager_ids = _get_manager_ids(db)
            mgr_msg = f"High priority task '{t.title}' (assigned to {name}) has been idle for {stalled_hours}h"
            for mid in manager_ids:
                if mid != assignee_id:
                    results.append({
                        "user_ids": [mid],
                        "message": mgr_msg,
                        "trigger_type": "ignored_high_priority_mgr",
                        "entity_id": t.id,
                    })

    return results


# ── Public API ──────────────────────────────────────────────────────

def run_ai_notification_cycle(db: Session) -> int:
    total = 0
    checks = [
        ("delay_risk", _check_delay_risk),
        ("overloaded", _check_overloaded),
        ("delayed_approval", _check_delayed_approvals),
        ("ignored_high_priority", _check_ignored_high_priority),
    ]
    for name, check_fn in checks:
        try:
            alerts = check_fn(db)
            for alert in alerts:
                asyncio.ensure_future(_notify_users(
                    db, alert["user_ids"], alert["message"],
                    alert["trigger_type"], alert["entity_id"],
                ))
                total += len(alert["user_ids"])
            if alerts:
                logger.debug("AI notification '%s': %d alerts", name, len(alerts))
        except Exception as exc:
            logger.error("AI notification '%s' failed: %s", name, exc)

    if total:
        logger.info("AI notification cycle: %d notifications sent", total)
    return total


async def _background_loop():
    logger.info("AI notification daemon starting (interval=%ds)", CHECK_INTERVAL)
    while True:
        try:
            from app.db.session import SessionLocal
            db = SessionLocal()
            try:
                run_ai_notification_cycle(db)
            finally:
                db.close()
        except Exception as exc:
            logger.error("AI notification cycle error: %s", exc)
        await asyncio.sleep(CHECK_INTERVAL)


def start_ai_notification_daemon():
    asyncio.ensure_future(_background_loop())
    logger.info("AI notification daemon scheduled")
