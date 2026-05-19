from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.task import Task
from app.models.approval import Approval
from app.models.user import User
from app.models.audit_log import AuditLog
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


DELAY_WEIGHTS = {
    "due_date": 0.30,
    "workload": 0.15,
    "stagnation": 0.20,
    "history": 0.20,
    "approval": 0.15,
}


@dataclass
class DelayRiskItemData:
    task_id: int
    title: str
    status: str
    priority: str
    due_date: Optional[str]
    days_remaining: Optional[int]
    assignee_name: Optional[str]
    assignee_email: Optional[str]
    assignee_id: Optional[int]
    risk_score: float
    risk_level: str
    confidence_score: float
    predicted_delay_days: Optional[int]
    factors: dict
    warnings: list[str]


class DelayRiskAnalyzer:
    def __init__(self, db: Session, rules_engine):
        self.db = db
        self.rules = rules_engine
        self.now = datetime.utcnow()
        self._workload_cache: dict[int, int] = {}
        self._history_cache: dict[int, Optional[float]] = {}

    def _score_due_date(self, task) -> tuple[float, float]:
        if task.due_date is None:
            return 2.0, 0.5
        delta = (task.due_date - self.now).days
        if delta < 0:
            return 10.0, 1.0
        elif delta <= 1:
            return 9.0, 1.0
        elif delta <= 3:
            return 7.0, 1.0
        elif delta <= 7:
            return 5.0, 0.9
        elif delta <= 14:
            return 3.0, 0.7
        else:
            return 1.0, 0.6

    def _score_workload(self, assigned_to_id: Optional[int]) -> tuple[float, float]:
        if assigned_to_id is None:
            return 0.0, 0.3
        if assigned_to_id not in self._workload_cache:
            count = self.db.query(Task).filter(
                Task.assigned_to_id == assigned_to_id,
                Task.status != "done",
            ).count()
            self._workload_cache[assigned_to_id] = count
        cnt = self._workload_cache[assigned_to_id]
        if cnt >= 10:
            return 10.0, 0.9
        elif cnt >= 7:
            return 7.5, 0.85
        elif cnt >= 5:
            return 5.0, 0.8
        elif cnt >= 3:
            return 3.0, 0.7
        else:
            return 0.0, 0.6

    def _score_stagnation(self, task) -> tuple[float, float]:
        if task.status == "done":
            return 0.0, 1.0
        stalled_hours = (self.now - task.updated_at).total_seconds() / 3600
        if stalled_hours < 4:
            return 0.0, 0.6
        elif stalled_hours < 24:
            return 3.0, 0.7
        elif stalled_hours < 48:
            return 5.0, 0.85
        elif stalled_hours < 72:
            return 7.0, 0.9
        else:
            return 10.0, 0.95

    def _score_history(self, assigned_to_id: Optional[int]) -> tuple[float, float]:
        if assigned_to_id is None:
            return 5.0, 0.4
        if assigned_to_id in self._history_cache:
            val = self._history_cache[assigned_to_id]
            if val is None:
                return 5.0, 0.4
            return val
        result = self.db.query(
            func.avg(
                func.extract("epoch", Task.updated_at - Task.created_at) / 86400
            )
        ).filter(
            Task.assigned_to_id == assigned_to_id,
            Task.status == "done",
            Task.updated_at.isnot(None),
            Task.created_at.isnot(None),
        ).scalar()
        if result is None:
            self._history_cache[assigned_to_id] = None
            return 5.0, 0.4
        avg_days = float(result)
        self._history_cache[assigned_to_id] = avg_days
        if avg_days <= 1:
            return 0.0, 0.8
        elif avg_days <= 3:
            return 2.0, 0.8
        elif avg_days <= 7:
            return 5.0, 0.75
        elif avg_days <= 14:
            return 7.0, 0.7
        else:
            return 9.0, 0.65

    def _score_approval(self, user_id: Optional[int]) -> tuple[float, float]:
        if user_id is None:
            return 0.0, 0.3
        pending = self.db.query(Approval).filter(
            Approval.requested_by == user_id,
            Approval.status == "pending",
        ).count()
        if pending == 0:
            return 0.0, 0.5
        max_wait = self.db.query(
            func.min(Approval.created_at)
        ).filter(
            Approval.requested_by == user_id,
            Approval.status == "pending",
        ).scalar()
        if max_wait is None:
            return 3.0, 0.6
        wait_hours = (self.now - max_wait).total_seconds() / 3600
        if wait_hours < 24:
            return 3.0, 0.7
        elif wait_hours < 48:
            return 5.0, 0.8
        elif wait_hours < 72:
            return 7.0, 0.85
        else:
            return 9.0, 0.9

    def _compute_predicted_delay(self, risk_score: float, days_remaining: Optional[int]) -> Optional[int]:
        if days_remaining is None:
            if risk_score >= 7:
                return 3
            return None
        if days_remaining < 0:
            return abs(days_remaining) + max(1, int(risk_score / 2))
        at_risk_threshold = self.rules.at_risk_days
        if days_remaining <= at_risk_threshold and risk_score >= 5:
            return int((at_risk_threshold - days_remaining + 1) * (risk_score / 5))
        return None

    def _generate_warnings(self, task, factors: dict) -> list[str]:
        warnings = []
        if factors.get("due_date", {}).get("score", 0) >= 8:
            warnings.append("Task is overdue or due within 24 hours")
        if factors.get("stagnation", {}).get("score", 0) >= 7:
            hours = int((self.now - task.updated_at).total_seconds() / 3600)
            warnings.append(f"No progress in {hours}+ hours")
        if factors.get("workload", {}).get("score", 0) >= 7:
            warnings.append("Assignee has excessive workload")
        if factors.get("history", {}).get("score", 0) >= 7:
            warnings.append("Assignee's historical completion is slow")
        if factors.get("approval", {}).get("score", 0) >= 7:
            warnings.append("Pending approvals may be blocking progress")
        return warnings

    def analyze(self, base_query=None) -> list[DelayRiskItemData]:
        logger.debug("Starting delay risk analysis")
        q = base_query if base_query is not None else self.db.query(Task)
        tasks = q.filter(
            Task.status != "done",
        ).options(
            joinedload(Task.assignee)
        ).order_by(Task.due_date.asc().nullslast()).all()

        results = []
        for t in tasks:
            uid = t.assigned_to_id

            ds, dc = self._score_due_date(t)
            ws, wc = self._score_workload(uid)
            ss, sc = self._score_stagnation(t)
            hs, hc = self._score_history(uid)
            aps, apc = self._score_approval(t.created_by_id)

            raw_score = (
                ds * DELAY_WEIGHTS["due_date"]
                + ws * DELAY_WEIGHTS["workload"]
                + ss * DELAY_WEIGHTS["stagnation"]
                + hs * DELAY_WEIGHTS["history"]
                + aps * DELAY_WEIGHTS["approval"]
            )
            risk_score = round(raw_score, 2)

            if risk_score >= 6.5:
                risk_level = "high"
            elif risk_score >= 3.5:
                risk_level = "medium"
            else:
                risk_level = "low"

            effective_confidence = (
                dc * DELAY_WEIGHTS["due_date"]
                + wc * DELAY_WEIGHTS["workload"]
                + sc * DELAY_WEIGHTS["stagnation"]
                + hc * DELAY_WEIGHTS["history"]
                + apc * DELAY_WEIGHTS["approval"]
            )
            confidence = round(min(1.0, effective_confidence + 0.15), 2)

            days_remaining = (t.due_date - self.now).days if t.due_date else None
            predicted_delay = self._compute_predicted_delay(risk_score, days_remaining)

            factors = {
                "due_date": {"score": ds, "confidence": dc, "weight": DELAY_WEIGHTS["due_date"]},
                "workload": {"score": ws, "confidence": wc, "weight": DELAY_WEIGHTS["workload"]},
                "stagnation": {"score": ss, "confidence": sc, "weight": DELAY_WEIGHTS["stagnation"]},
                "history": {"score": hs, "confidence": hc, "weight": DELAY_WEIGHTS["history"]},
                "approval": {"score": aps, "confidence": apc, "weight": DELAY_WEIGHTS["approval"]},
            }
            warnings = self._generate_warnings(t, factors)

            results.append(DelayRiskItemData(
                task_id=t.id,
                title=t.title,
                status=t.status,
                priority=t.priority,
                due_date=t.due_date.isoformat() if t.due_date else None,
                days_remaining=days_remaining,
                assignee_name=t.assignee.name if t.assignee else None,
                assignee_email=t.assignee.email if t.assignee else None,
                assignee_id=uid,
                risk_score=risk_score,
                risk_level=risk_level,
                confidence_score=confidence,
                predicted_delay_days=predicted_delay,
                factors=factors,
                warnings=warnings,
            ))

        results.sort(key=lambda x: x.risk_score, reverse=True)
        logger.debug(
            "Delay risk analysis: %d tasks analyzed, %d high risk, %d medium risk",
            len(results),
            sum(1 for r in results if r.risk_level == "high"),
            sum(1 for r in results if r.risk_level == "medium"),
        )
        return results
