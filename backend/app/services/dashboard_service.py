from sqlalchemy.orm import Session
from sqlalchemy import func, case
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
