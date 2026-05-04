from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.task import Task
from app.models.approval import Approval
from app.models.user import User


def get_summary(db: Session):
    total_tasks = db.query(Task).count()
    completed = db.query(Task).filter(Task.status == "done").count()
    pending = db.query(Task).filter(Task.status != "done").count()

    approvals_pending = db.query(Approval).filter(
        Approval.status == "pending"
    ).count()

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed,
        "pending_tasks": pending,
        "pending_approvals": approvals_pending
    }


def get_task_distribution(db: Session):
    return [
        {"name": "To Do", "count": db.query(Task).filter(Task.status == "todo").count()},
        {"name": "In Progress", "count": db.query(Task).filter(Task.status == "in_progress").count()},
        {"name": "Review", "count": db.query(Task).filter(Task.status == "review").count()},
        {"name": "Done", "count": db.query(Task).filter(Task.status == "done").count()},
    ]


def get_approval_stats(db: Session):
    return {
        "pending": db.query(Approval).filter(Approval.status == "pending").count(),
        "approved": db.query(Approval).filter(Approval.status == "approved").count(),
        "rejected": db.query(Approval).filter(Approval.status == "rejected").count(),
        "hold": db.query(Approval).filter(Approval.status == "hold").count(),
    }


def get_performance(db: Session):
    data = db.query(
        User.name,
        func.count(Task.id).label("tasks_count")
    ).join(Task, Task.assigned_to_id == User.id)\
     .group_by(User.name)\
     .all()

    return [
        {"user": name, "tasks": count}
        for name, count in data
    ]
