from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Any
from math import sqrt

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.task import Task
from app.models.approval import Approval
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.comment import Comment
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
                (func.UNIX_TIMESTAMP(Task.updated_at) - func.UNIX_TIMESTAMP(Task.created_at)) / 86400
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
        ).order_by(Task.due_date.is_(None), Task.due_date.asc()).all()

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


ASSIGN_WEIGHTS = {
    "workload": 0.25,
    "experience": 0.15,
    "speed": 0.20,
    "priority_match": 0.15,
    "role_fit": 0.10,
    "reliability": 0.15,
}


@dataclass
class CandidateScore:
    user_id: int
    name: str
    email: str
    role: str
    total_score: float
    factors: dict
    reason: str


class AssignmentRecommender:
    def __init__(self, db: Session, rules_engine):
        self.db = db
        self.rules = rules_engine
        self.now = datetime.utcnow()

    def _workload_score(self, user_id: int) -> tuple[float, float]:
        active = self.db.query(Task).filter(
            Task.assigned_to_id == user_id,
            Task.status != "done",
        ).count()
        if active == 0:
            return 100.0, 0.9
        elif active <= 2:
            return 85.0, 0.85
        elif active <= 4:
            return 65.0, 0.8
        elif active <= 7:
            return 40.0, 0.75
        elif active <= 10:
            return 20.0, 0.7
        else:
            return 5.0, 0.65

    def _experience_score(self, user_id: int) -> tuple[float, float]:
        completed = self.db.query(Task).filter(
            Task.assigned_to_id == user_id,
            Task.status == "done",
        ).count()
        if completed >= 50:
            return 100.0, 0.9
        elif completed >= 30:
            return 85.0, 0.85
        elif completed >= 15:
            return 65.0, 0.8
        elif completed >= 5:
            return 40.0, 0.7
        elif completed >= 1:
            return 20.0, 0.6
        else:
            return 5.0, 0.4

    def _speed_score(self, user_id: int) -> tuple[float, float]:
        result = self.db.query(
            func.avg(
                (func.UNIX_TIMESTAMP(Task.updated_at) - func.UNIX_TIMESTAMP(Task.created_at)) / 86400
            )
        ).filter(
            Task.assigned_to_id == user_id,
            Task.status == "done",
            Task.updated_at.isnot(None),
            Task.created_at.isnot(None),
        ).scalar()
        if result is None:
            return 50.0, 0.5
        avg_days = float(result)
        if avg_days <= 1:
            return 100.0, 0.9
        elif avg_days <= 3:
            return 80.0, 0.85
        elif avg_days <= 7:
            return 55.0, 0.8
        elif avg_days <= 14:
            return 30.0, 0.7
        else:
            return 10.0, 0.6

    def _priority_match_score(self, user_id: int, priority: str) -> tuple[float, float]:
        if not priority:
            return 50.0, 0.5
        same_priority_done = self.db.query(Task).filter(
            Task.assigned_to_id == user_id,
            Task.priority == priority,
            Task.status == "done",
        ).count()
        if same_priority_done >= 10:
            return 100.0, 0.9
        elif same_priority_done >= 5:
            return 80.0, 0.85
        elif same_priority_done >= 2:
            return 55.0, 0.75
        elif same_priority_done >= 1:
            return 30.0, 0.65
        else:
            return 10.0, 0.5

    def _role_fit_score(self, user_role: str, task_priority: str) -> tuple[float, float]:
        if task_priority == "high" and user_role in ("admin", "manager"):
            return 100.0, 0.9
        elif task_priority == "high" and user_role == "employee":
            return 60.0, 0.7
        elif task_priority == "medium" and user_role in ("manager", "employee"):
            return 90.0, 0.85
        elif task_priority == "low":
            return 95.0, 0.8
        elif user_role == "admin":
            return 70.0, 0.6
        return 80.0, 0.75

    def _reliability_score(self, user_id: int) -> tuple[float, float]:
        total_done = self.db.query(Task).filter(
            Task.assigned_to_id == user_id,
            Task.status == "done",
        ).count()
        if total_done == 0:
            return 50.0, 0.4
        overdue_done = self.db.query(Task).filter(
            Task.assigned_to_id == user_id,
            Task.status == "done",
            Task.due_date.isnot(None),
            Task.updated_at > Task.due_date,
        ).count()
        on_time = total_done - overdue_done
        rate = on_time / total_done
        score = rate * 100
        if total_done < 5:
            confidence = 0.5
        elif total_done < 15:
            confidence = 0.7
        else:
            confidence = 0.85
        return round(score, 1), confidence

    def _generate_reason(self, user, factors: dict, total_score: float) -> str:
        reason_parts = []
        ws = factors.get("workload", {}).get("score", 0)
        ss = factors.get("speed", {}).get("score", 0)
        ps = factors.get("priority_match", {}).get("score", 0)
        rs = factors.get("reliability", {}).get("score", 0)
        es = factors.get("experience", {}).get("score", 0)
        if ws >= 80:
            reason_parts.append("low workload")
        if ss >= 80:
            reason_parts.append("fast completion history")
        elif ss >= 55:
            reason_parts.append("solid completion speed")
        if ps >= 80:
            reason_parts.append("strong track record in similar priority tasks")
        if rs >= 80:
            reason_parts.append("high on-time delivery rate")
        if es >= 65:
            reason_parts.append("extensive task experience")
        if not reason_parts:
            return "Available and suitable for assignment"
        return " and ".join(reason_parts[:2]) + (
            f" ({total_score}/100)" if len(reason_parts) <= 2 else ""
        )

    def recommend(self, priority: Optional[str] = None, exclude_user_id: Optional[int] = None) -> list[CandidateScore]:
        logger.info("Running assignment recommendation (priority=%s)", priority or "any")
        users_q = self.db.query(User).filter(
            User.is_active == True,
            User.role.in_(["admin", "manager", "employee"]),
        )
        if exclude_user_id is not None:
            users_q = users_q.filter(User.id != exclude_user_id)
        users = users_q.all()

        candidates = []
        for u in users:
            uid = u.id
            ws, wc = self._workload_score(uid)
            es, ec = self._experience_score(uid)
            ss, sc = self._speed_score(uid)
            ps, pc = self._priority_match_score(uid, priority)
            rfs, rfc = self._role_fit_score(u.role.value if hasattr(u.role, "value") else str(u.role), priority)
            rls, rlc = self._reliability_score(uid)

            total = (
                ws * ASSIGN_WEIGHTS["workload"]
                + es * ASSIGN_WEIGHTS["experience"]
                + ss * ASSIGN_WEIGHTS["speed"]
                + ps * ASSIGN_WEIGHTS["priority_match"]
                + rfs * ASSIGN_WEIGHTS["role_fit"]
                + rls * ASSIGN_WEIGHTS["reliability"]
            )
            total = round(total, 1)

            factors = {
                "workload": {"score": ws, "confidence": wc, "weight": ASSIGN_WEIGHTS["workload"]},
                "experience": {"score": es, "confidence": ec, "weight": ASSIGN_WEIGHTS["experience"]},
                "speed": {"score": ss, "confidence": sc, "weight": ASSIGN_WEIGHTS["speed"]},
                "priority_match": {"score": ps, "confidence": pc, "weight": ASSIGN_WEIGHTS["priority_match"]},
                "role_fit": {"score": rfs, "confidence": rfc, "weight": ASSIGN_WEIGHTS["role_fit"]},
                "reliability": {"score": rls, "confidence": rlc, "weight": ASSIGN_WEIGHTS["reliability"]},
            }
            name = u.name or u.email
            reason = self._generate_reason(u, factors, total)

            candidates.append(CandidateScore(
                user_id=uid,
                name=name,
                email=u.email,
                role=u.role.value if hasattr(u.role, "value") else str(u.role),
                total_score=total,
                factors=factors,
                reason=reason,
            ))

        candidates.sort(key=lambda c: c.total_score, reverse=True)
        logger.debug("Assignment recommendation: %d candidates evaluated", len(candidates))
        return candidates


@dataclass
class MonthlyTrendData:
    month: str
    completed: int
    avg_completion_days: Optional[float]
    delay_pct: float


@dataclass
class UserPerfData:
    user_id: int
    name: str
    email: str
    role: str
    performance_score: float
    reliability_score: float
    speed_score: float
    avg_completion_days: Optional[float]
    delay_pct: float
    total_completed: int
    total_delayed: int
    approval_rate: float
    avg_approval_hours: Optional[float]
    total_comments: int
    monthly_trends: list[MonthlyTrendData]
    suggestions: list[str]


@dataclass
class PerformanceResult:
    users: list[UserPerfData]
    top_performers: list[UserPerfData]
    low_performers: list[UserPerfData]
    team_avg_completion_days: Optional[float]
    team_delay_pct: float
    team_avg_performance: float
    team_avg_reliability: float


class PerformanceAnalyzer:
    def __init__(self, db: Session):
        self.db = db
        self.now = datetime.utcnow()

    def _batch_completion_days(self, user_ids: list[int]) -> dict[int, tuple[Optional[float], int]]:
        rows = self.db.query(
            Task.assigned_to_id,
            func.avg((func.UNIX_TIMESTAMP(Task.updated_at) - func.UNIX_TIMESTAMP(Task.created_at)) / 86400),
            func.count(Task.id),
        ).filter(
            Task.assigned_to_id.in_(user_ids),
            Task.status == "done",
            Task.updated_at.isnot(None),
            Task.created_at.isnot(None),
        ).group_by(Task.assigned_to_id).all()
        result = {}
        for uid, avg, cnt in rows:
            result[uid] = (round(float(avg), 1), cnt) if avg else (None, 0)
        return result

    def _batch_delay_stats(self, user_ids: list[int]) -> dict[int, tuple[int, int, float]]:
        done_rows = self.db.query(
            Task.assigned_to_id,
            func.count(Task.id),
        ).filter(
            Task.assigned_to_id.in_(user_ids),
            Task.status == "done",
        ).group_by(Task.assigned_to_id).all()
        done_map = {uid: cnt for uid, cnt in done_rows}

        delayed_rows = self.db.query(
            Task.assigned_to_id,
            func.count(Task.id),
        ).filter(
            Task.assigned_to_id.in_(user_ids),
            Task.status == "done",
            Task.due_date.isnot(None),
            Task.updated_at > Task.due_date,
        ).group_by(Task.assigned_to_id).all()
        delayed_map = {uid: cnt for uid, cnt in delayed_rows}

        result = {}
        for uid in user_ids:
            done = done_map.get(uid, 0)
            delayed = delayed_map.get(uid, 0)
            delay_pct = round(delayed / done * 100, 1) if done > 0 else 0.0
            result[uid] = (done, delayed, delay_pct)
        return result

    def _batch_approval_stats(self, user_ids: list[int]) -> dict[int, tuple[float, Optional[float]]]:
        total_rows = self.db.query(
            Approval.requested_by,
            func.count(Approval.id),
        ).filter(
            Approval.requested_by.in_(user_ids),
        ).group_by(Approval.requested_by).all()
        total_map = {uid: cnt for uid, cnt in total_rows}

        approved_rows = self.db.query(
            Approval.requested_by,
            func.count(Approval.id),
        ).filter(
            Approval.requested_by.in_(user_ids),
            Approval.status == "approved",
        ).group_by(Approval.requested_by).all()
        approved_map = {uid: cnt for uid, cnt in approved_rows}

        avg_time_rows = self.db.query(
            Approval.requested_by,
            func.avg((func.UNIX_TIMESTAMP(Approval.updated_at) - func.UNIX_TIMESTAMP(Approval.created_at)) / 3600),
        ).filter(
            Approval.requested_by.in_(user_ids),
            Approval.status == "approved",
            Approval.updated_at.isnot(None),
        ).group_by(Approval.requested_by).all()
        avg_time_map = {uid: round(float(avg), 1) for uid, avg in avg_time_rows if avg}

        result = {}
        for uid in user_ids:
            total = total_map.get(uid, 0)
            approved = approved_map.get(uid, 0)
            rate = round(approved / total * 100, 1) if total > 0 else 0.0
            avg_hours = avg_time_map.get(uid, None)
            result[uid] = (rate, avg_hours)
        return result

    def _batch_comment_counts(self, user_ids: list[int]) -> dict[int, int]:
        rows = self.db.query(
            Comment.user_id,
            func.count(Comment.id),
        ).filter(
            Comment.user_id.in_(user_ids),
        ).group_by(Comment.user_id).all()
        return {uid: cnt for uid, cnt in rows}

    def _batch_monthly_trends(self, user_ids: list[int]) -> dict[int, list[MonthlyTrendData]]:
        six_months_ago = self.now - timedelta(days=180)
        tasks = self.db.query(Task).filter(
            Task.assigned_to_id.in_(user_ids),
            Task.status == "done",
            Task.updated_at >= six_months_ago,
        ).all()
        groups: dict[int, dict] = {}
        for t in tasks:
            uid = t.assigned_to_id
            if uid not in groups:
                groups[uid] = {}
            key = t.updated_at.strftime("%Y-%m")
            if key not in groups[uid]:
                groups[uid][key] = {"completed": 0, "delayed": 0, "total_days": 0.0, "count_days": 0}
            m = groups[uid][key]
            m["completed"] += 1
            if t.due_date and t.updated_at > t.due_date:
                m["delayed"] += 1
            if t.created_at and t.updated_at:
                days = (t.updated_at - t.created_at).total_seconds() / 86400
                m["total_days"] += days
                m["count_days"] += 1
        result = {}
        for uid in user_ids:
            trends = []
            monthly = groups.get(uid, {})
            for month in sorted(monthly.keys()):
                m = monthly[month]
                avg_days = round(m["total_days"] / m["count_days"], 1) if m["count_days"] > 0 else None
                delay_pct = round(m["delayed"] / m["completed"] * 100, 1) if m["completed"] > 0 else 0.0
                trends.append(MonthlyTrendData(
                    month=month, completed=m["completed"],
                    avg_completion_days=avg_days, delay_pct=delay_pct,
                ))
            result[uid] = trends
        return result

    def _compute_scores(self, avg_days: Optional[float], delay_pct: float, approval_rate: float,
                        comment_count: int, trends: list[MonthlyTrendData]) -> tuple[float, float, float]:
        speed_score = 100.0
        if avg_days is not None:
            if avg_days <= 1:
                speed_score = 100
            elif avg_days <= 3:
                speed_score = 85
            elif avg_days <= 7:
                speed_score = 65
            elif avg_days <= 14:
                speed_score = 40
            else:
                speed_score = 20

        reliability_score = max(0, 100 - delay_pct * 1.5)
        reliability_score = min(100, reliability_score)

        approval_score = approval_rate * 0.8 + (100 if approval_rate > 0 else 0) * 0.2
        approval_score = min(100, approval_score)

        comment_score = min(100, comment_count * 5)

        trend_score = 50.0
        if len(trends) >= 2:
            recent = trends[-1]
            older = trends[-2]
            if recent.avg_completion_days and older.avg_completion_days:
                if recent.avg_completion_days < older.avg_completion_days:
                    trend_score = 80
                elif recent.avg_completion_days == older.avg_completion_days:
                    trend_score = 60
                else:
                    trend_score = 35
            if recent.completed > older.completed:
                trend_score = min(100, trend_score + 10)
        elif len(trends) == 1:
            trend_score = 60

        performance_score = (
            speed_score * 0.30
            + reliability_score * 0.25
            + approval_score * 0.20
            + comment_score * 0.10
            + trend_score * 0.15
        )
        performance_score = round(min(100, performance_score), 1)

        return performance_score, round(reliability_score, 1), round(speed_score, 1)

    def _suggestions(self, perf: UserPerfData) -> list[str]:
        s = []
        if perf.delay_pct > 30:
            s.append("High delay rate — focus on time management and realistic deadlines")
        if perf.speed_score < 50:
            s.append("Completion speed is slow — consider breaking tasks into smaller subtasks")
        if perf.approval_rate < 50 and perf.total_completed > 0:
            s.append("Low approval rate — review quality of submissions before requesting approval")
        if perf.total_comments < 5 and perf.total_completed > 3:
            s.append("Low communication engagement — increase collaboration via task comments")
        if perf.total_completed == 0:
            s.append("No tasks completed yet — start with smaller tasks to build momentum")
        trending_up = False
        if len(perf.monthly_trends) >= 2:
            if perf.monthly_trends[-1].completed > perf.monthly_trends[-2].completed:
                trending_up = True
        if not trending_up and perf.total_completed >= 3:
            s.append("Productivity is plateauing — set weekly completion goals")
        if not s:
            s.append("Strong performance — maintain current momentum")
        return s

    def analyze(self) -> PerformanceResult:
        logger.debug("Starting performance analytics")
        users = self.db.query(User).filter(
            User.is_active == True,
            User.role.in_(["admin", "manager", "employee"]),
        ).all()

        user_ids = [u.id for u in users]
        if not user_ids:
            return PerformanceResult(users=[], top_performers=[], low_performers=[],
                                     team_avg_completion_days=None, team_delay_pct=0,
                                     team_avg_performance=0, team_avg_reliability=0)

        batch_avg_days = self._batch_completion_days(user_ids)
        batch_delays = self._batch_delay_stats(user_ids)
        batch_approval = self._batch_approval_stats(user_ids)
        batch_comments = self._batch_comment_counts(user_ids)
        batch_trends = self._batch_monthly_trends(user_ids)

        perf_users = []
        for u in users:
            uid = u.id
            avg_days, _ = batch_avg_days.get(uid, (None, 0))
            done, delayed, delay_pct = batch_delays.get(uid, (0, 0, 0.0))
            appr_rate, appr_hours = batch_approval.get(uid, (0.0, None))
            comments = batch_comments.get(uid, 0)
            trends = batch_trends.get(uid, [])
            perf_score, rel_score, spd_score = self._compute_scores(
                avg_days, delay_pct, appr_rate, comments, trends,
            )
            p = UserPerfData(
                user_id=uid,
                name=u.name or u.email,
                email=u.email,
                role=u.role.value if hasattr(u.role, "value") else str(u.role),
                performance_score=perf_score,
                reliability_score=rel_score,
                speed_score=spd_score,
                avg_completion_days=avg_days,
                delay_pct=delay_pct,
                total_completed=done,
                total_delayed=delayed,
                approval_rate=appr_rate,
                avg_approval_hours=appr_hours,
                total_comments=comments,
                monthly_trends=trends,
                suggestions=[],
            )
            p.suggestions = self._suggestions(p)
            perf_users.append(p)

        perf_users.sort(key=lambda x: x.performance_score, reverse=True)
        top = perf_users[:5]
        low = [u for u in perf_users if u.total_completed > 0]
        low.sort(key=lambda x: x.performance_score)
        low = low[:5]

        users_with_data = [u for u in perf_users if u.total_completed > 0]
        team_avg_days = None
        if users_with_data:
            days = [u.avg_completion_days for u in users_with_data if u.avg_completion_days is not None]
            if days:
                team_avg_days = round(sum(days) / len(days), 1)
        team_delay = (
            round(sum(u.delay_pct for u in users_with_data) / len(users_with_data), 1)
            if users_with_data else 0.0
        )
        team_avg_perf = (
            round(sum(u.performance_score for u in perf_users) / len(perf_users), 1)
            if perf_users else 0.0
        )
        team_avg_rel = (
            round(sum(u.reliability_score for u in perf_users) / len(perf_users), 1)
            if perf_users else 0.0
        )

        logger.debug(
            "Performance analytics: %d users, team perf=%.1f, delay=%.1f%%",
            len(perf_users), team_avg_perf, team_delay,
        )
        return PerformanceResult(
            users=perf_users,
            top_performers=top,
            low_performers=low,
            team_avg_completion_days=team_avg_days,
            team_delay_pct=team_delay,
            team_avg_performance=team_avg_perf,
            team_avg_reliability=team_avg_rel,
        )

@dataclass
class EmployeeWorkload:
    user_id: int
    name: str
    email: str
    role: str
    active_tasks: int
    pending_approvals: int
    overdue_tasks: int
    completed_tasks: int
    total_assignments: int
    workload_score: float
    efficiency_score: float
    status: str
    active_task_details: list[dict] = field(default_factory=list)


@dataclass
class TeamBalanceMetrics:
    total_employees: int
    total_active_tasks: int
    mean_workload: float
    std_dev_workload: float
    overloaded_count: int
    balanced_count: int
    underutilized_count: int
    overloaded_pct: float
    underutilized_pct: float
    balanced_pct: float
    health_score: float
    recommendations: list[str]


@dataclass
class WorkloadAnalysisResult:
    employees: list[EmployeeWorkload] = field(default_factory=list)
    team_balance: Optional[TeamBalanceMetrics] = None
    distribution: dict[str, int] = field(default_factory=dict)


@dataclass
class Recommendation:
    type: str
    priority: str
    confidence: float
    title: str
    description: str
    action: str
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    impact: Optional[str] = None
    metric_value: Optional[float] = None
    source: str = ""


class RecommendationEngine:
    """Centralized recommendation engine that aggregates all analyzers
    into unified, priority-ordered recommendations with confidence scoring."""

    def __init__(self, db: Session, rules_engine):
        self.db = db
        self.rules = rules_engine
        self.now = datetime.utcnow()

    def _prioritize_by_type(self, rec: Recommendation) -> int:
        priority_map = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        type_map = {"escalation": 0, "prioritization": 1, "redistribution": 2, "assignment": 3}
        return (priority_map.get(rec.priority, 3), type_map.get(rec.type, 3))

    def _get_prioritization_recs(self) -> list[Recommendation]:
        recs = []

        # from delay risk: critical tasks needing immediate attention
        delay = DelayRiskAnalyzer(self.db, self.rules)
        items = delay.analyze()

        critical_items = [i for i in items if i.risk_level == "high"]
        for item in critical_items[:5]:
            priority = "critical" if item.risk_score >= 7.5 else "high"
            title = f"Prioritize: {item.title}"
            desc = f"Risk score {item.risk_score} — {', '.join(item.warnings[:2])}" if item.warnings else \
                   f"Predicted delay of {item.predicted_delay_days}d with {item.confidence_score:.0%} confidence"
            recs.append(Recommendation(
                type="prioritization",
                priority=priority,
                confidence=item.confidence_score,
                title=title,
                description=desc,
                action=f"Review and expedite task #{item.task_id}",
                entity_id=item.task_id,
                entity_name=item.title,
                impact=f"Reduce delay risk by ~{min(80, int(item.risk_score * 10))}%",
                metric_value=item.risk_score,
                source="DelayRiskAnalyzer",
            ))

        if not critical_items:
            # if no critical risks, check high priority pending
            task_q = self.db.query(Task).filter(
                Task.priority == "high",
                Task.status.in_(["todo", "in_progress"]),
            ).options(joinedload(Task.assignee)).order_by(Task.due_date.asc()).limit(5).all()

            for t in task_q:
                days_left = (t.due_date - self.now).days if t.due_date else None
                urgency = "critical" if days_left is not None and days_left <= 1 else "high"
                recs.append(Recommendation(
                    type="prioritization",
                    priority=urgency,
                    confidence=0.75,
                    title=f"Complete: {t.title}",
                    description=f"High-priority task with {days_left}d remaining" if days_left else "High-priority task needs attention",
                    action=f"Focus on task #{t.id} next",
                    entity_id=t.id,
                    entity_name=t.title,
                    impact="Prevents scheduling bottlenecks",
                    metric_value=days_left or 0,
                    source="TaskAnalyzer",
                ))

        return recs

    def _get_escalation_recs(self) -> list[Recommendation]:
        recs = []
        approval = ApprovalAnalyzer(self.db, self.rules)
        result = approval.analyze()

        for a in result.delayed_approvals[:5]:
            urgency = "critical" if a["wait_hours"] >= 72 else "high"
            recs.append(Recommendation(
                type="escalation",
                priority=urgency,
                confidence=min(0.95, 0.5 + a["wait_hours"] / 200),
                title=f"Escalate approval: {a['title']}",
                description=f"Waiting {a['wait_hours']}h for approval from {a['requester'] or 'unknown'}",
                action=f"Send reminder or escalate approval #{a['id']}",
                entity_id=a["id"],
                entity_name=a["title"],
                impact=f"Reduce approval wait by ~{min(80, int(a['wait_hours'] * 0.4))}%",
                metric_value=a["wait_hours"],
                source="ApprovalAnalyzer",
            ))

        if not result.delayed_approvals and result.pending > 0:
            recs.append(Recommendation(
                type="escalation",
                priority="low",
                confidence=0.5,
                title="No delayed approvals",
                description=f"{result.pending} pending approvals are within acceptable timeframe",
                action="Monitor approval queue regularly",
                impact="Maintain current approval velocity",
                source="ApprovalAnalyzer",
            ))

        return recs

    def _get_redistribution_recs(self) -> list[Recommendation]:
        recs = []
        engine = WorkloadAnalysisEngine(self.db, self.rules)
        result = engine.analyze()

        tb = result.team_balance
        if not tb or tb.total_employees == 0:
            return recs

        if tb.health_score < 50:
            recs.append(Recommendation(
                type="redistribution",
                priority="critical",
                confidence=min(0.95, (100 - tb.health_score) / 100 + 0.3),
                title="Critical workload imbalance detected",
                description=f"Health score {tb.health_score}/100 — {tb.overloaded_count} overloaded, {tb.underutilized_count} underutilized, std dev {tb.std_dev_workload}",
                action="Redistribute tasks immediately to balance the team",
                impact=f"Reduce overload by ~{min(80, tb.overloaded_pct)}%",
                metric_value=tb.std_dev_workload,
                source="WorkloadAnalysisEngine",
            ))
        elif tb.health_score < 70:
            recs.append(Recommendation(
                type="redistribution",
                priority="high",
                confidence=0.75,
                title="Workload distribution could be improved",
                description=f"Health score {tb.health_score}/100 — {tb.overloaded_count} overloaded employees need relief",
                action="Consider reassigning tasks from overloaded team members",
                impact=f"Improve team health by ~{min(40, 100 - tb.health_score)} points",
                metric_value=tb.health_score,
                source="WorkloadAnalysisEngine",
            ))

        if tb.recommendations:
            for r in tb.recommendations:
                if "balanced" not in r.lower():
                    recs.append(Recommendation(
                        type="redistribution",
                        priority="high" if "Redistribute" in r else "medium",
                        confidence=0.7,
                        title=f"Reassign tasks: {r[:60]}",
                        description=r,
                        action=r,
                        impact="Improves team productivity and prevents burnout",
                        source="WorkloadAnalysisEngine",
                    ))

        return recs

    def _get_assignment_recs(self) -> list[Recommendation]:
        recs = []
        skip = True
        # find tasks without assignee or high-priority unassigned
        unassigned_high = self.db.query(Task).filter(
            Task.assigned_to_id.is_(None),
            Task.status.in_(["todo", "in_progress"]),
        ).order_by(Task.priority.desc(), Task.due_date.asc()).limit(5).all()

        for t in unassigned_high:
            recommender = AssignmentRecommender(self.db, self.rules)
            candidates = recommender.recommend(priority=t.priority)
            if candidates:
                top = candidates[0]
                recs.append(Recommendation(
                    type="assignment",
                    priority="high" if t.priority == "high" else "medium",
                    confidence=top.total_score / 100,
                    title=f"Assign {t.title} to {top.name}",
                    description=f"Best candidate scored {top.total_score}/100 — {top.reason}",
                    action=f"Assign task #{t.id} to {top.name} ({top.email})",
                    entity_id=t.id,
                    entity_name=t.title,
                    impact=f"Expected completion ~{max(1, 5 - int(top.total_score / 25))}d faster",
                    metric_value=top.total_score,
                    source="AssignmentRecommender",
                ))

        return recs

    def generate(self) -> list[Recommendation]:
        logger.info("Generating unified recommendations from all analyzers")
        all_recs = []
        all_recs.extend(self._get_prioritization_recs())
        all_recs.extend(self._get_escalation_recs())
        all_recs.extend(self._get_redistribution_recs())
        all_recs.extend(self._get_assignment_recs())

        all_recs.sort(key=self._prioritize_by_type)
        logger.info("Generated %d recommendations", len(all_recs))
        return all_recs


class WorkloadAnalysisEngine:
    def __init__(self, db: Session, rules_engine):
        self.db = db
        self.rules = rules_engine
        self.now = datetime.utcnow()
        self._overload_threshold = rules_engine.workload_high
        self._critical_threshold = rules_engine.workload_critical

    def _active_tasks(self, user_id: int) -> tuple[int, list]:
        q = self.db.query(Task).filter(
            Task.assigned_to_id == user_id,
            Task.status != "done",
        ).order_by(Task.due_date.asc()).all()
        details = []
        for t in q:
            details.append({
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
            })
        return len(q), details

    def _pending_approvals(self, user_id: int) -> int:
        return self.db.query(Approval).filter(
            Approval.requested_by == user_id,
            Approval.status == "pending",
        ).count()

    def _overdue_tasks(self, user_id: int) -> int:
        return self.db.query(Task).filter(
            Task.assigned_to_id == user_id,
            Task.status != "done",
            Task.due_date < self.now,
        ).count()

    def _completed_tasks(self, user_id: int) -> int:
        return self.db.query(Task).filter(
            Task.assigned_to_id == user_id,
            Task.status == "done",
        ).count()

    def _total_assignments(self, user_id: int) -> int:
        return self.db.query(Task).filter(
            Task.assigned_to_id == user_id,
        ).count()

    def _workload_score(self, active: int, overdue: int, pending: int) -> float:
        raw = active + (overdue * 2) + (pending * 0.5)
        if raw >= self._critical_threshold * 2:
            return 10.0
        elif raw >= self._critical_threshold:
            return 8.0
        elif raw >= self._overload_threshold:
            return 6.0
        elif raw >= 3:
            return 4.0
        elif raw >= 1:
            return 2.0
        return 0.0

    def _efficiency_score(self, user_id: int, active: int) -> float:
        completed_30d = self.db.query(Task).filter(
            Task.assigned_to_id == user_id,
            Task.status == "done",
            Task.updated_at >= self.now - timedelta(days=30),
        ).count()
        if active == 0 and completed_30d == 0:
            return 0.0
        if active == 0:
            return 10.0
        ratio = completed_30d / max(1, active)
        return min(10.0, ratio * 5)

    def _determine_status(self, workload: float, efficiency: float, active: int) -> str:
        if active >= self._critical_threshold or workload >= 8.0:
            return "overloaded"
        if active >= self._overload_threshold or workload >= 6.0:
            return "overloaded"
        if active == 0 and efficiency < 2.0:
            return "underutilized"
        if active <= 1 and workload <= 2.0:
            return "underutilized"
        return "balanced"

    def _compute_team_balance(self, employees: list[EmployeeWorkload]) -> TeamBalanceMetrics:
        n = len(employees)
        if n == 0:
            return TeamBalanceMetrics(
                total_employees=0, total_active_tasks=0, mean_workload=0,
                std_dev_workload=0, overloaded_count=0, balanced_count=0,
                underutilized_count=0, overloaded_pct=0, underutilized_pct=0,
                balanced_pct=0, health_score=0, recommendations=[],
            )
        total_active = sum(e.active_tasks for e in employees)
        mean = total_active / n if n else 0
        variance = sum((e.active_tasks - mean) ** 2 for e in employees) / n if n else 0
        std_dev = sqrt(variance)

        overloaded = [e for e in employees if e.status == "overloaded"]
        balanced = [e for e in employees if e.status == "balanced"]
        underutilized = [e for e in employees if e.status == "underutilized"]

        overload_pct = len(overloaded) / n * 100
        under_pct = len(underutilized) / n * 100
        bal_pct = len(balanced) / n * 100

        overload_factor = max(0, 100 - overload_pct * 1.5)
        under_factor = max(0, 100 - under_pct)
        std_factor = max(0, 100 - std_dev * 15)
        health_score = round((overload_factor * 0.4 + under_factor * 0.3 + std_factor * 0.3), 1)

        recommendations = []
        if overloaded:
            names = ", ".join(e.name for e in overloaded[:3])
            recommendations.append(
                f"Redistribute tasks from {names}" + (" and others" if len(overloaded) > 3 else "")
            )
        if underutilized:
            names = ", ".join(e.name for e in underutilized[:3])
            recommendations.append(
                f"Assign more tasks to {names}" + (" and others" if len(underutilized) > 3 else "")
            )
        if std_dev > 3:
            recommendations.append("Team workload distribution is uneven — consider load balancing")
        if not recommendations:
            recommendations.append("Team workload is well balanced")

        return TeamBalanceMetrics(
            total_employees=n,
            total_active_tasks=total_active,
            mean_workload=round(mean, 1),
            std_dev_workload=round(std_dev, 2),
            overloaded_count=len(overloaded),
            balanced_count=len(balanced),
            underutilized_count=len(underutilized),
            overloaded_pct=round(overload_pct, 1),
            underutilized_pct=round(under_pct, 1),
            balanced_pct=round(bal_pct, 1),
            health_score=health_score,
            recommendations=recommendations,
        )

    def analyze(self) -> WorkloadAnalysisResult:
        logger.debug("Starting workload analysis")
        users = self.db.query(User).filter(
            User.is_active == True,
            User.role.in_(["admin", "manager", "employee"]),
        ).all()

        distribution = {"overloaded": 0, "balanced": 0, "underutilized": 0}
        employees = []

        for u in users:
            uid = u.id
            active, details = self._active_tasks(uid)
            pending = self._pending_approvals(uid)
            overdue = self._overdue_tasks(uid)
            completed = self._completed_tasks(uid)
            total = self._total_assignments(uid)
            ws = self._workload_score(active, overdue, pending)
            es = self._efficiency_score(uid, active)
            status = self._determine_status(ws, es, active)

            distribution[status] = distribution.get(status, 0) + 1

            employees.append(EmployeeWorkload(
                user_id=uid,
                name=u.name or u.email,
                email=u.email,
                role=u.role.value if hasattr(u.role, "value") else str(u.role),
                active_tasks=active,
                pending_approvals=pending,
                overdue_tasks=overdue,
                completed_tasks=completed,
                total_assignments=total,
                workload_score=round(ws, 1),
                efficiency_score=round(es, 1),
                status=status,
                active_task_details=details,
            ))

        employees.sort(key=lambda e: e.workload_score, reverse=True)
        team_balance = self._compute_team_balance(employees)

        logger.debug(
            "Workload analysis complete: %d employees, %d overloaded, %d underutilized",
            len(employees), distribution.get("overloaded", 0), distribution.get("underutilized", 0),
        )
        return WorkloadAnalysisResult(
            employees=employees,
            team_balance=team_balance,
            distribution=distribution,
        )
