from datetime import datetime

from sqlalchemy.orm import Session, joinedload
from app.models.task import Task
from app.models.approval import Approval
from app.models.ai import AIAnalysis
from app.core.log import get_logger
from app.core.config import settings
from app.core.cache import cached
from app.ai.rules import RulesEngine
from app.ai.analyzers import TaskAnalyzer, ApprovalAnalyzer, WorkloadAnalyzer
from app.ai.insights import InsightGenerator
from app.schemas.ai import AIRequest

logger = get_logger("ai.service")


def _calculate_urgency(due_date, now):
    if due_date is None:
        return {"score": 0, "level": "low", "days_remaining": None}
    days_remaining = (due_date - now).days
    if days_remaining < 0:
        score = min(20, 10 + abs(days_remaining))
        return {"score": score, "level": "critical", "days_remaining": days_remaining}
    elif days_remaining <= 1:
        return {"score": 9, "level": "critical", "days_remaining": days_remaining}
    elif days_remaining <= 3:
        return {"score": 7, "level": "high", "days_remaining": days_remaining}
    elif days_remaining <= 7:
        return {"score": 4, "level": "medium", "days_remaining": days_remaining}
    else:
        return {"score": 2, "level": "low", "days_remaining": days_remaining}


def _task_base_query(db: Session, current_user):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    q = db.query(Task)
    if role == "admin":
        return q
    elif role == "manager":
        return q.filter(
            (Task.created_by_id == current_user.id) |
            (Task.assigned_to_id == current_user.id)
        )
    else:
        return q.filter(Task.assigned_to_id == current_user.id)


def _approval_base_query(db: Session, current_user):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    q = db.query(Approval)
    if role == "manager":
        return q.filter(Approval.current_level == "manager")
    return q


class AIService:
    def __init__(self, db: Session):
        self.db = db
        self.rules = RulesEngine()
        self.task_analyzer = TaskAnalyzer(db, self.rules)
        self.approval_analyzer = ApprovalAnalyzer(db, self.rules)
        self.workload_analyzer = WorkloadAnalyzer(db, self.rules)
        self.insight_generator = InsightGenerator(self.rules)

    @cached(prefix="ai:summary", ttl=lambda: settings.CACHE_TTL_AI, exclude_args=[0], exclude_kwargs=None)
    def generate_summary(self, current_user) -> dict:
        logger.info("Generating AI summary for user_id=%d role=%s", current_user.id, current_user.role)

        task_query = _task_base_query(self.db, current_user)
        approval_query = _approval_base_query(self.db, current_user)
        workload_query = task_query

        task_result = self.task_analyzer.analyze(task_query)
        approval_result = self.approval_analyzer.analyze(approval_query)
        workload_result = self.workload_analyzer.analyze(workload_query)

        insights = []
        recommendations = []

        hp_insights, hp_recs = self.insight_generator.high_priority_pending(
            task_result.high_priority_pending, task_result.high_priority_tasks,
        )
        insights.extend(hp_insights)
        recommendations.extend(hp_recs)

        od_insights, od_recs = self.insight_generator.overdue_tasks(
            task_result.overdue, task_result.overdue_tasks,
        )
        insights.extend(od_insights)
        recommendations.extend(od_recs)

        ar_insights, ar_recs = self.insight_generator.at_risk_tasks(
            task_result.at_risk, task_result.at_risk_tasks,
        )
        insights.extend(ar_insights)
        recommendations.extend(ar_recs)

        bl_insights, bl_recs = self.insight_generator.blocked_workflows(
            task_result.blocked, task_result.blocked_tasks,
        )
        insights.extend(bl_insights)
        recommendations.extend(bl_recs)

        ol_insights, ol_recs = self.insight_generator.overloaded_employees(
            workload_result.overloaded, workload_result.critical,
            workload_result.user_details,
        )
        insights.extend(ol_insights)
        recommendations.extend(ol_recs)

        ab_insights, ab_recs = self.insight_generator.approval_bottlenecks(
            approval_result.delayed, approval_result.pending,
            approval_result.delayed_approvals,
        )
        insights.extend(ab_insights)
        recommendations.extend(ab_recs)

        insights.extend(self.insight_generator.due_today(task_result.due_today))
        insights.extend(self.insight_generator.weekly_completion(task_result.completed_week))
        insights.extend(self.insight_generator.lightly_loaded(
            workload_result.lightly_loaded, workload_result.user_details, task_result.total,
        ))

        summary = self.insight_generator.build_summary(task_result, approval_result, {})

        stats = {
            "total_tasks": task_result.total,
            "pending": task_result.pending,
            "in_review": task_result.in_review,
            "completed": task_result.completed,
            "high_priority": task_result.high_priority_pending,
            "overdue": task_result.overdue,
            "due_today": task_result.due_today,
            "completed_this_week": task_result.completed_week,
            "at_risk": task_result.at_risk,
            "blocked": task_result.blocked,
            "total_approvals": approval_result.total,
            "pending_approvals": approval_result.pending,
            "approved_approvals": approval_result.approved,
            "rejected_approvals": approval_result.rejected,
            "delayed_approvals": approval_result.delayed,
            "status_distribution": task_result.status_distribution,
            "priority_distribution": task_result.priority_distribution,
        }

        logger.info(
            "AI summary generated: %d insights, %d recommendations",
            len(insights), len(recommendations),
        )

        return {
            "summary": summary,
            "stats": stats,
            "insights": insights,
            "recommendations": recommendations,
        }

    def generate_suggestion(self, request: AIRequest, current_user) -> dict:
        logger.info("AI suggestion requested by user_id=%d", current_user.id)

        if request.task_id:
            task = self.db.query(Task).filter(Task.id == request.task_id).first()
            if not task:
                from fastapi import HTTPException
                raise HTTPException(404, "Task not found")

        task_result = self.task_analyzer.analyze(_task_base_query(self.db, current_user))

        suggestion_parts = []
        if task_result.high_priority_pending > 0:
            suggestion_parts.append(f"{task_result.high_priority_pending} high priority tasks need attention.")
        if task_result.overdue > 0:
            suggestion_parts.append(f"{task_result.overdue} tasks are overdue.")
        if task_result.at_risk > 0:
            suggestion_parts.append(f"{task_result.at_risk} tasks at risk of missing deadlines.")
        if task_result.blocked > 0:
            suggestion_parts.append(f"{task_result.blocked} workflows appear blocked.")
        if task_result.completed_week > 0:
            suggestion_parts.append(f"Great progress — {task_result.completed_week} tasks completed this week.")

        if not suggestion_parts:
            suggestion = "All tasks are on track. Keep up the good work!"
        else:
            suggestion = " ".join(suggestion_parts)

        if request.context:
            suggestion = f"Context: {request.context}\n\n{suggestion}"

        analysis = AIAnalysis(
            user_id=current_user.id,
            task_id=request.task_id,
            prompt=request.prompt,
            response=suggestion,
            model_name="ai-engine",
            tokens_used=len(request.prompt.split()) + len(suggestion.split()),
        )
        self.db.add(analysis)
        self.db.commit()

        return {
            "suggestion": suggestion,
            "model_used": "ai-engine",
            "tokens_used": analysis.tokens_used,
        }

    def get_high_priority_tasks(self, current_user) -> list[dict]:
        logger.info("Fetching high priority pending tasks for user_id=%d", current_user.id)
        now = datetime.utcnow()
        q = _task_base_query(self.db, current_user).filter(
            Task.priority == "high",
            Task.status != "done",
        )
        tasks = q.options(joinedload(Task.assignee)).order_by(Task.due_date.asc()).all()
        results = []
        for t in tasks:
            urgency = _calculate_urgency(t.due_date, now)
            results.append({
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "days_remaining": urgency["days_remaining"],
                "urgency_score": urgency["score"],
                "urgency_level": urgency["level"],
                "assignee": t.assignee.email if t.assignee else None,
                "assignee_name": t.assignee.name if t.assignee else None,
            })
        results.sort(key=lambda x: x["urgency_score"], reverse=True)
        logger.info("Found %d high priority pending tasks", len(results))
        return results

    def get_history(self, current_user, skip: int = 0, limit: int = 50):
        return (
            self.db.query(AIAnalysis)
            .filter(AIAnalysis.user_id == current_user.id)
            .order_by(AIAnalysis.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )


def get_ai_service(db: Session) -> AIService:
    return AIService(db)
