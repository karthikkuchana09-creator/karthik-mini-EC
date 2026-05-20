from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, text
from app.models.task import Task
from app.models.approval import Approval
from app.models.user import User
from app.core.log import get_logger
from app.core.config import settings
from app.core.cache import cached

logger = get_logger("dashboard_service")


@cached(prefix="dashboard:summary", ttl=lambda: settings.CACHE_TTL_DASHBOARD, exclude_args=[0])
def get_summary(db: Session):
    task_counts = db.query(
        func.count(Task.id).label("total"),
        func.sum(case((Task.status == "done", 1), else_=0)).label("completed"),
        func.sum(case((Task.status != "done", 1), else_=0)).label("pending"),
    ).one()

    pending_approvals = db.query(func.count(Approval.id)).filter(
        Approval.status == "pending"
    ).scalar()

    logger.info("Dashboard summary: total=%d completed=%d pending=%d approvals=%d",
                task_counts.total, task_counts.completed, task_counts.pending, pending_approvals)

    return {
        "total_tasks": task_counts.total,
        "completed_tasks": task_counts.completed,
        "pending_tasks": task_counts.pending,
        "pending_approvals": pending_approvals,
    }


@cached(prefix="dashboard:distribution", ttl=lambda: settings.CACHE_TTL_DASHBOARD, exclude_args=[0])
def get_task_distribution(db: Session):
    rows = db.query(
        Task.status,
        func.count(Task.id).label("count"),
    ).group_by(Task.status).all()

    status_map = {r.status: r.count for r in rows}
    order = ["todo", "in_progress", "review", "done"]
    labels = {"todo": "To Do", "in_progress": "In Progress", "review": "Review", "done": "Done"}

    distribution = [{"name": labels[s], "count": status_map.get(s, 0)} for s in order]
    logger.debug("Task distribution: %s", distribution)
    return distribution


@cached(prefix="dashboard:approval_stats", ttl=lambda: settings.CACHE_TTL_DASHBOARD, exclude_args=[0])
def get_approval_stats(db: Session):
    rows = db.query(
        Approval.status,
        func.count(Approval.id).label("count"),
    ).group_by(Approval.status).all()

    stats = {"pending": 0, "approved": 0, "rejected": 0, "hold": 0}
    for r in rows:
        key = r.status
        if key == "on_hold":
            key = "hold"
        if key in stats:
            stats[key] = r.count

    logger.debug("Approval stats: %s", stats)
    return stats


@cached(prefix="dashboard:performance", ttl=lambda: settings.CACHE_TTL_DASHBOARD, exclude_args=[0])
def get_performance(db: Session):
    data = db.query(
        User.name,
        func.count(Task.id).label("tasks_count")
    ).join(Task, Task.assigned_to_id == User.id)\
     .group_by(User.name)\
     .all()

    performance = [{"user": name, "tasks": count} for name, count in data]
    logger.debug("Performance data: %s", performance)
    return performance


@cached(prefix="dashboard:ai_summary", ttl=lambda: settings.CACHE_TTL_DASHBOARD, exclude_args=[0])
def get_enterprise_ai_summary(db: Session) -> dict:
    """Optimized enterprise AI dashboard summary with 5 aggregate queries."""
    now = datetime.utcnow()
    delay_threshold_hours = 48
    workload_high = 5
    at_risk_days = 2

    # ── 1. Task risk metrics (single query) ──
    task_row = db.query(
        func.sum(case(
            (and_(Task.priority == "high", Task.status.in_(["todo", "in_progress"])), 1),
            else_=0
        )).label("high_priority_pending"),
        func.sum(case(
            (and_(Task.due_date < now, Task.status != "done"), 1),
            else_=0
        )).label("overdue"),
        func.sum(case(
            (and_(
                Task.due_date.isnot(None),
                Task.due_date <= now + timedelta(days=at_risk_days),
                Task.due_date >= now,
                Task.status.in_(["todo", "in_progress"]),
            ), 1),
            else_=0
        )).label("at_risk"),
        func.sum(case(
            (and_(Task.status == "in_progress", Task.updated_at <= now - timedelta(hours=24)), 1),
            else_=0
        )).label("blocked"),
        func.sum(case(
            (and_(func.date(Task.due_date) == func.date(now), Task.status != "done"), 1),
            else_=0
        )).label("due_today"),
        func.sum(case(
            (and_(Task.status == "done", Task.updated_at >= now - timedelta(days=7)), 1),
            else_=0
        )).label("completed_week"),
    ).one()

    # ── 2. Delayed approvals ──
    delayed_approvals = db.query(func.count(Approval.id)).filter(
        Approval.status == "pending",
        Approval.created_at < now - timedelta(hours=delay_threshold_hours),
    ).scalar() or 0

    pending_approvals = db.query(func.count(Approval.id)).filter(
        Approval.status == "pending",
    ).scalar() or 0

    # ── 3. Overloaded employees ──
    overloaded_row = db.query(
        Task.assigned_to_id,
        func.count(Task.id).label("task_count"),
    ).filter(
        Task.assigned_to_id.isnot(None),
        Task.status != "done",
    ).group_by(Task.assigned_to_id).having(
        func.count(Task.id) >= workload_high,
    ).all()
    overloaded_count = len(overloaded_row)
    critical_count = sum(1 for _, cnt in overloaded_row if cnt >= 10)

    underutilized_count = 0
    underutilized_subq = db.query(
        Task.assigned_to_id,
        func.count(Task.id).label("task_count"),
    ).filter(
        Task.assigned_to_id.isnot(None),
        Task.status != "done",
    ).group_by(Task.assigned_to_id).having(
        func.count(Task.id) == 0,
    ).subquery()
    total_users = db.query(func.count(User.id)).filter(
        User.is_active == True,
    ).scalar() or 0
    users_with_tasks = len(overloaded_row)
    underutilized_count = max(0, total_users - users_with_tasks)

    # ── 4. Team performance avg ──
    perf_row = db.query(
        func.avg(case(
            (and_(
                Task.status == "done",
                Task.updated_at.isnot(None),
                Task.created_at.isnot(None),
            ), func.TIMESTAMPDIFF(text("SECOND"), Task.created_at, Task.updated_at) / 86400),
        )).label("avg_completion_days"),
    ).one()
    avg_completion = round(perf_row.avg_completion_days, 1) if perf_row.avg_completion_days else None

    # ── 5. Build summary strings ──
    summary = []

    H = task_row
    if H.high_priority_pending > 0:
        summary.append(f"{H.high_priority_pending} high priority task{'s' if H.high_priority_pending != 1 else ''} pending")
    if H.overdue > 0:
        summary.append(f"{H.overdue} task{'s' if H.overdue != 1 else ''} overdue")
    if H.at_risk > 0:
        summary.append(f"{H.at_risk} task{'s' if H.at_risk != 1 else ''} at risk of delay")
    if H.blocked > 0:
        summary.append(f"{H.blocked} task{'s' if H.blocked != 1 else ''} blocked — no progress in 24+ hours")
    if H.due_today > 0:
        summary.append(f"{H.due_today} task{'s' if H.due_today != 1 else ''} due today")

    if delayed_approvals > 0:
        summary.append(f"{delayed_approvals} delayed approval{'s' if delayed_approvals != 1 else ''} pending escalation")
    elif pending_approvals > 0:
        summary.append(f"{pending_approvals} approval{'s' if pending_approvals != 1 else ''} pending review")

    if critical_count > 0:
        summary.append(f"{critical_count} employee{'s' if critical_count != 1 else ''} critically overloaded")
    elif overloaded_count > 0:
        summary.append(f"{overloaded_count} employee{'s' if overloaded_count != 1 else ''} overloaded")
    if underutilized_count > 0:
        summary.append(f"{underutilized_count} employee{'s' if underutilized_count != 1 else ''} available for assignments")

    if H.completed_week > 0:
        summary.append(f"{H.completed_week} task{'s' if H.completed_week != 1 else ''} completed this week")
    if avg_completion is not None:
        if avg_completion <= 2:
            summary.append("Team completion speed is strong (avg < 2 days)")
        elif avg_completion <= 5:
            summary.append(f"Average completion time {avg_completion} days — on track")
        else:
            summary.append(f"Average completion time {avg_completion}d — consider process improvements")

    if not summary:
        summary.append("All metrics healthy — no action items")

    logger.info(
        "Enterprise AI summary: %d items (hp=%d overdue=%d at_risk=%d blocked=%d approvals=%d overloaded=%d)",
        len(summary), H.high_priority_pending, H.overdue, H.at_risk, H.blocked,
        delayed_approvals, overloaded_count,
    )
    return {"summary": summary}
