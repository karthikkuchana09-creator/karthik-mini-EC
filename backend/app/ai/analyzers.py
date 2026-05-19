from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.task import Task
from app.models.approval import Approval
from app.models.user import User
from app.core.log import get_logger

logger = get_logger("ai.analyzers")


@dataclass
class TaskAnalysisResult:
    total: int = 0
    pending: int = 0
    in_review: int = 0
    completed: int = 0
    high_priority_pending: int = 0
    overdue: int = 0
    due_today: int = 0
    completed_week: int = 0
    at_risk: int = 0
    blocked: int = 0
    overdue_tasks: list[dict] = field(default_factory=list)
    high_priority_tasks: list[dict] = field(default_factory=list)
    at_risk_tasks: list[dict] = field(default_factory=list)
    blocked_tasks: list[dict] = field(default_factory=list)
    status_distribution: dict[str, int] = field(default_factory=dict)
    priority_distribution: dict[str, int] = field(default_factory=dict)


@dataclass
class ApprovalAnalysisResult:
    total: int = 0
    pending: int = 0
    approved: int = 0
    rejected: int = 0
    delayed: int = 0
    delayed_approvals: list[dict] = field(default_factory=list)
    pending_approvals: list[dict] = field(default_factory=list)


@dataclass
class WorkloadAnalysisResult:
    assignments: dict[int, int] = field(default_factory=dict)
    overloaded: dict[int, int] = field(default_factory=dict)
    critical: dict[int, int] = field(default_factory=dict)
    lightly_loaded: dict[int, int] = field(default_factory=dict)
    user_details: dict[int, Any] = field(default_factory=dict)


class TaskAnalyzer:
    def __init__(self, db: Session, rules_engine):
        self.db = db
        self.rules = rules_engine
        self.now = datetime.utcnow()

    def analyze(self, base_query=None) -> TaskAnalysisResult:
        logger.debug("Starting task analysis")
        result = TaskAnalysisResult()

        q = base_query if base_query is not None else self.db.query(Task)

        result.total = q.count()

        result.status_distribution = {
            row[0]: row[1]
            for row in q.with_entities(Task.status, func.count(Task.id))
            .group_by(Task.status).all()
        }

        result.priority_distribution = {
            row[0]: row[1]
            for row in q.with_entities(Task.priority, func.count(Task.id))
            .group_by(Task.priority).all()
        }

        result.pending = q.filter(Task.status.in_(["todo", "in_progress"])).count()
        result.in_review = q.filter(Task.status == "review").count()
        result.completed = q.filter(Task.status == "done").count()

        hp_q = q.filter(
            Task.priority == "high",
            Task.status.in_(["todo", "in_progress"]),
        )
        result.high_priority_pending = hp_q.count()

        hp_tasks = hp_q.options(joinedload(Task.assignee)).order_by(Task.due_date.asc()).limit(10).all()
        for t in hp_tasks:
            result.high_priority_tasks.append({
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "assignee": t.assignee.email if t.assignee else None,
                "assignee_name": t.assignee.name if t.assignee else None,
            })

        overdue_q = q.filter(
            Task.due_date < self.now,
            Task.status != "done",
        )
        result.overdue = overdue_q.count()

        overdue_tasks = overdue_q.options(
            joinedload(Task.assignee)
        ).order_by(Task.due_date.asc()).limit(10).all()
        for t in overdue_tasks:
            days_late = (self.now - t.due_date).days
            result.overdue_tasks.append({
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "days_late": days_late,
                "assignee": t.assignee.email if t.assignee else None,
                "assignee_name": t.assignee.name if t.assignee else None,
            })

        due_today_q = q.filter(
            func.date(Task.due_date) == func.date(self.now),
            Task.status != "done",
        )
        result.due_today = due_today_q.count()

        result.completed_week = q.filter(
            Task.status == "done",
            Task.updated_at >= self.now - timedelta(days=7),
        ).count()

        at_risk_q = q.filter(
            Task.due_date.isnot(None),
            Task.due_date <= self.now + timedelta(days=self.rules.at_risk_days),
            Task.due_date >= self.now,
            Task.status.in_(["todo", "in_progress"]),
        )
        result.at_risk = at_risk_q.count()

        at_risk_tasks = at_risk_q.options(
            joinedload(Task.assignee)
        ).order_by(Task.due_date.asc()).limit(10).all()
        for t in at_risk_tasks:
            remaining = (t.due_date - self.now).days
            result.at_risk_tasks.append({
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "days_remaining": remaining,
                "assignee": t.assignee.email if t.assignee else None,
            })

        blocked_q = q.filter(
            Task.status == "in_progress",
            Task.updated_at <= self.now - timedelta(hours=self.rules.blocked_hours),
        )
        result.blocked = blocked_q.count()

        blocked_tasks = blocked_q.options(
            joinedload(Task.assignee)
        ).order_by(Task.updated_at.asc()).limit(10).all()
        for t in blocked_tasks:
            stalled = int((self.now - t.updated_at).total_seconds() / 3600)
            result.blocked_tasks.append({
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "stalled_hours": stalled,
                "assignee": t.assignee.email if t.assignee else None,
            })

        logger.debug(
            "Task analysis complete: total=%d hp=%d overdue=%d at_risk=%d blocked=%d",
            result.total, result.high_priority_pending,
            result.overdue, result.at_risk, result.blocked,
        )
        return result


class ApprovalAnalyzer:
    def __init__(self, db: Session, rules_engine):
        self.db = db
        self.rules = rules_engine
        self.now = datetime.utcnow()

    def analyze(self, base_query=None) -> ApprovalAnalysisResult:
        logger.debug("Starting approval analysis")
        result = ApprovalAnalysisResult()

        q = base_query if base_query is not None else self.db.query(Approval)

        result.total = q.count()
        result.pending = q.filter(Approval.status == "pending").count()
        result.approved = q.filter(Approval.status == "approved").count()
        result.rejected = q.filter(Approval.status == "rejected").count()

        delayed_q = q.filter(
            Approval.status == "pending",
            Approval.created_at < self.now - timedelta(hours=self.rules.approval_delay_hours),
        )
        result.delayed = delayed_q.count()

        delayed = delayed_q.options(
            joinedload(Approval.requester)
        ).order_by(Approval.created_at.asc()).limit(10).all()
        for a in delayed:
            wait_hours = int((self.now - a.created_at).total_seconds() / 3600)
            result.delayed_approvals.append({
                "id": a.id,
                "title": a.title,
                "wait_hours": wait_hours,
                "requester": a.requester.email if a.requester else None,
            })

        pending_items = q.filter(Approval.status == "pending").options(
            joinedload(Approval.requester)
        ).order_by(Approval.created_at.asc()).limit(10).all()
        for a in pending_items:
            wait_hours = int((self.now - a.created_at).total_seconds() / 3600)
            result.pending_approvals.append({
                "id": a.id,
                "title": a.title,
                "wait_hours": wait_hours,
                "requester": a.requester.email if a.requester else None,
            })

        logger.debug(
            "Approval analysis: total=%d pending=%d delayed=%d",
            result.total, result.pending, result.delayed,
        )
        return result


class WorkloadAnalyzer:
    def __init__(self, db: Session, rules_engine):
        self.db = db
        self.rules = rules_engine
        self.now = datetime.utcnow()

    def analyze(self, base_query=None) -> WorkloadAnalysisResult:
        logger.debug("Starting workload analysis")
        result = WorkloadAnalysisResult()

        q = base_query if base_query is not None else self.db.query(Task)

        assignee_data = q.filter(
            Task.assigned_to_id.isnot(None),
            Task.status != "done",
        ).with_entities(
            Task.assigned_to_id,
            func.count(Task.id),
        ).group_by(Task.assigned_to_id).all()

        for assignee_id, task_count in assignee_data:
            result.assignments[assignee_id] = task_count

        result.overloaded = {
            uid: cnt for uid, cnt in result.assignments.items()
            if cnt >= self.rules.workload_high
        }
        result.critical = {
            uid: cnt for uid, cnt in result.assignments.items()
            if cnt >= self.rules.workload_critical
        }
        result.lightly_loaded = {
            uid: cnt for uid, cnt in result.assignments.items()
            if cnt <= 2
        }

        if result.assignments:
            user_ids = list(result.assignments.keys())
            users = self.db.query(User).filter(User.id.in_(user_ids)).all()
            result.user_details = {u.id: {"name": u.name, "email": u.email} for u in users}

        logger.debug(
            "Workload analysis: %d users, %d overloaded, %d critical",
            len(result.assignments), len(result.overloaded), len(result.critical),
        )
        return result
