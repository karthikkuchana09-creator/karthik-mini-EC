from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.task import Task
from app.models.approval import Approval
from app.models.user import User
from app.core.log import get_logger

logger = get_logger("dashboard_service")


def get_summary(db: Session):
    total_tasks = db.query(Task).count()
    completed = db.query(Task).filter(Task.status == "done").count()
    pending = db.query(Task).filter(Task.status != "done").count()

    approvals_pending = db.query(Approval).filter(
        Approval.status == "pending"
    ).count()

    logger.info("Dashboard summary: total=%d completed=%d pending=%d approvals=%d",
                total_tasks, completed, pending, approvals_pending)

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed,
        "pending_tasks": pending,
        "pending_approvals": approvals_pending
    }


def get_task_distribution(db: Session):
    distribution = [
        {"name": "To Do", "count": db.query(Task).filter(Task.status == "todo").count()},
        {"name": "In Progress", "count": db.query(Task).filter(Task.status == "in_progress").count()},
        {"name": "Review", "count": db.query(Task).filter(Task.status == "review").count()},
        {"name": "Done", "count": db.query(Task).filter(Task.status == "done").count()},
    ]
    logger.debug("Task distribution: %s", distribution)
    return distribution


def get_approval_stats(db: Session):
    stats = {
        "pending": db.query(Approval).filter(Approval.status == "pending").count(),
        "approved": db.query(Approval).filter(Approval.status == "approved").count(),
        "rejected": db.query(Approval).filter(Approval.status == "rejected").count(),
        "hold": db.query(Approval).filter(Approval.status == "hold").count(),
    }
    logger.debug("Approval stats: %s", stats)
    return stats


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
