import random
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from app.models.ai import AIAnalysis
from app.models.task import Task
from app.models.approval import Approval
from app.models.user import User
from app.core.log import get_logger
from app.core.config import settings
from app.core.cache import cached
from app.schemas.ai import AIRequest

logger = get_logger("ai_service")

OVERDUE_THRESHOLD_HOURS = 2
APPROVAL_DELAY_HOURS = 48
WORKLOAD_HIGH_THRESHOLD = 5
WORKLOAD_CRITICAL_THRESHOLD = 10


def _task_base_query(db: Session, current_user):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    stmt = select(Task)

    if role == "admin":
        return stmt
    elif role == "manager":
        return stmt.where(
            (Task.created_by_id == current_user.id) |
            (Task.assigned_to_id == current_user.id)
        )
    else:
        return stmt.where(Task.assigned_to_id == current_user.id)


def generate_suggestion(db: Session, request: AIRequest, current_user):
    logger.info("AI suggestion requested by user_id=%d prompt=%s", current_user.id, request.prompt[:50])

    if request.task_id:
        task = db.scalar(select(Task).where(Task.id == request.task_id))
        if not task:
            raise HTTPException(404, "Task not found")

    mock_responses = [
        "Consider breaking this task into smaller subtasks for better tracking.",
        "Based on the description, this task has high priority and should be assigned soon.",
        "I recommend setting a due date within the next week for optimal progress.",
        "This task could benefit from additional context or requirements documentation.",
        "Similar tasks typically take 2-3 days to complete based on historical data.",
    ]

    suggestion = random.choice(mock_responses)

    if request.context:
        suggestion = f"Context: {request.context}\n\n{suggestion}"

    tokens_used = len(request.prompt.split()) + len(suggestion.split())

    analysis = AIAnalysis(
        user_id=current_user.id,
        task_id=request.task_id,
        prompt=request.prompt,
        response=suggestion,
        model_name="gpt-4",
        tokens_used=tokens_used,
    )
    db.add(analysis)
    db.commit()

    logger.info("AI suggestion generated for user_id=%d tokens=%d", current_user.id, tokens_used)

    return {
        "suggestion": suggestion,
        "model_used": "gpt-4",
        "tokens_used": tokens_used,
    }


@cached(prefix="ai:summary", ttl=lambda: settings.CACHE_TTL_AI, exclude_args=[0], exclude_kwargs=None)
def generate_ai_summary(db: Session, current_user):
    logger.info("Generating AI summary for user_id=%d role=%s", current_user.id, current_user.role)
    now = datetime.utcnow()
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    base = _task_base_query(db, current_user)

    total = db.scalar(select(func.count()).select_from(base.subquery()))
    pending = db.scalar(select(func.count()).select_from(base.where(Task.status.in_(["todo", "in_progress"])).subquery()))
    in_review = db.scalar(select(func.count()).select_from(base.where(Task.status == "review").subquery()))
    done = db.scalar(select(func.count()).select_from(base.where(Task.status == "done").subquery()))
    high_priority = db.scalar(select(func.count()).select_from(base.where(
        Task.priority == "high",
        Task.status.in_(["todo", "in_progress"]),
    ).subquery()))
    overdue = db.scalar(select(func.count()).select_from(base.where(
        Task.due_date < now,
        Task.status != "done",
    ).subquery()))
    due_today = db.scalar(select(func.count()).select_from(base.where(
        func.date(Task.due_date) == func.date(now),
        Task.status != "done",
    ).subquery()))
    completed_week = db.scalar(select(func.count()).select_from(base.where(
        Task.status == "done",
        Task.updated_at >= now - timedelta(days=7),
    ).subquery()))

    stats = {
        "total_tasks": total,
        "pending": pending,
        "in_review": in_review,
        "completed": done,
        "high_priority": high_priority,
        "overdue": overdue,
        "due_today": due_today,
        "completed_this_week": completed_week,
    }

    insights = []
    recommendations = []

    if overdue > 0:
        insights.append({"type": "warning", "severity": "high"
                         if overdue > 3 else "medium",
                         "text": f"{overdue} task{'s' if overdue != 1 else ''} overdue."})
        overdue_tasks = db.execute(
            base.where(Task.due_date < now, Task.status != "done")
            .order_by(Task.due_date.asc())
            .limit(5)
        ).scalars().all()
        for t in overdue_tasks:
            days_late = (now - t.due_date).days
            assignee = t.assignee.email if t.assignee else "unassigned"
            recommendations.append({
                "severity": "high" if days_late > 7 else "medium",
                "message": f"\"{t.title}\" is {days_late} day{'s' if days_late != 1 else ''} overdue, assigned to {assignee}.",
                "action": f"Reassign or reprioritize task #{t.id}",
            })

    if high_priority > 0:
        insights.append({"type": "warning", "severity": "high"
                         if high_priority > 5 else "medium",
                         "text": f"{high_priority} high priority task{'s' if high_priority != 1 else ''} pending."})
        hp_tasks = db.execute(
            base.where(Task.priority == "high", Task.status.in_(["todo", "in_progress"]))
            .order_by(Task.due_date.asc())
            .limit(3)
        ).scalars().all()
        for t in hp_tasks:
            recommendations.append({
                "severity": "high",
                "message": f"High priority task \"{t.title}\" is {t.status.replace('_', ' ')}.",
                "action": f"Assign and prioritize task #{t.id}",
            })

    if due_today > 0:
        insights.append({"type": "info", "severity": "medium",
                         "text": f"{due_today} task{'s' if due_today != 1 else ''} due today."})

    if completed_week > 0:
        insights.append({"type": "positive", "severity": "low",
                         "text": f"{completed_week} task{'s' if completed_week != 1 else ''} completed this week."})

    approval_stmt = select(Approval)
    if role == "manager":
        approval_stmt = approval_stmt.where(Approval.current_level == "manager")

    total_approvals = db.scalar(select(func.count()).select_from(approval_stmt.subquery()))
    pending_approvals = db.scalar(select(func.count()).select_from(approval_stmt.where(Approval.status == "pending").subquery()))
    approved_count = db.scalar(select(func.count()).select_from(approval_stmt.where(Approval.status == "approved").subquery()))
    rejected_count = db.scalar(select(func.count()).select_from(approval_stmt.where(Approval.status == "rejected").subquery()))

    stats["total_approvals"] = total_approvals
    stats["pending_approvals"] = pending_approvals
    stats["approved_approvals"] = approved_count
    stats["rejected_approvals"] = rejected_count

    if pending_approvals > 0:
        delayed_approvals = db.scalar(select(func.count()).select_from(approval_stmt.where(
            Approval.status == "pending",
            Approval.created_at < now - timedelta(hours=APPROVAL_DELAY_HOURS),
        ).subquery()))

        if delayed_approvals > 0:
            insights.append({"type": "warning", "severity": "high"
                             if delayed_approvals > 3 else "medium",
                             "text": f"{delayed_approvals} approval{'s' if delayed_approvals != 1 else ''} delayed beyond {APPROVAL_DELAY_HOURS}h."})
            old_approvals = db.execute(
                approval_stmt.where(
                    Approval.status == "pending",
                    Approval.created_at < now - timedelta(hours=APPROVAL_DELAY_HOURS),
                ).order_by(Approval.created_at.asc()).limit(3)
            ).scalars().all()
            for a in old_approvals:
                wait_hours = int((now - a.created_at).total_seconds() / 3600)
                requester = a.requester.email if a.requester else "unknown"
                recommendations.append({
                    "severity": "high" if wait_hours > 72 else "medium",
                    "message": f"Approval \"{a.title}\" requested by {requester} has been waiting {wait_hours}h.",
                    "action": f"Review approval request #{a.id}",
                })
        else:
            insights.append({"type": "info", "severity": "low",
                             "text": f"{pending_approvals} approval{'s' if pending_approvals != 1 else ''} pending."})

    assignee_task_counts = {}
    if role == "admin":
        assignee_data = db.execute(
            select(Task.assigned_to_id, func.count(Task.id))
            .where(Task.assigned_to_id.isnot(None), Task.status != "done")
            .group_by(Task.assigned_to_id)
        ).all()
    else:
        assignee_data = db.execute(
            base.where(Task.assigned_to_id.isnot(None), Task.status != "done")
            .with_only_columns(Task.assigned_to_id, func.count(Task.id))
            .group_by(Task.assigned_to_id)
        ).all()

    for assignee_id, task_count in assignee_data:
        assignee_task_counts[assignee_id] = task_count

    if assignee_task_counts:
        overloaded = {uid: cnt for uid, cnt in assignee_task_counts.items()
                      if cnt >= WORKLOAD_HIGH_THRESHOLD}
        critical = {uid: cnt for uid, cnt in assignee_task_counts.items()
                    if cnt >= WORKLOAD_CRITICAL_THRESHOLD}

        if critical:
            user_ids = list(critical.keys())
            users_map = {
                u.id: u for u in db.execute(select(User).where(User.id.in_(user_ids))).scalars().all()
            }
            for uid, cnt in list(critical.items())[:3]:
                u = users_map.get(uid)
                name = u.email if u else f"User #{uid}"
                insights.append({
                    "type": "warning",
                    "severity": "high",
                    "text": f"{name} has {cnt} active tasks \u2014 workload is critical.",
                })
                recommendations.append({
                    "severity": "high",
                    "message": f"{name} is overloaded with {cnt} active tasks.",
                    "action": f"Redistribute tasks from user #{uid}",
                })

        if overloaded and not critical:
            user_ids = list(overloaded.keys())
            users_map = {
                u.id: u for u in db.execute(select(User).where(User.id.in_(user_ids))).scalars().all()
            }
            for uid, cnt in list(overloaded.items())[:2]:
                u = users_map.get(uid)
                name = u.email if u else f"User #{uid}"
                insights.append({
                    "type": "info",
                    "severity": "medium",
                    "text": f"{name} has {cnt} active tasks \u2014 workload is high.",
                })
                recommendations.append({
                    "severity": "medium",
                    "message": f"{name} workload is high with {cnt} active tasks.",
                    "action": f"Consider reassigning some tasks from user #{uid}",
                })

        lightly_loaded = {uid: cnt for uid, cnt in assignee_task_counts.items()
                          if cnt <= 2}
        if lightly_loaded and total > 5:
            user_ids = list(lightly_loaded.keys())
            users_map = {
                u.id: u for u in db.execute(select(User).where(User.id.in_(user_ids))).scalars().all()
            }
            for uid, cnt in list(lightly_loaded.items())[:2]:
                u = users_map.get(uid)
                name = u.email if u else f"User #{uid}"
                insights.append({
                    "type": "positive",
                    "severity": "low",
                    "text": f"{name} has only {cnt} active task{'s' if cnt != 1 else ''} \u2014 available for assignments.",
                })

    summary_parts = []
    if total == 0:
        summary_parts.append("No tasks found.")
    else:
        summary_parts.append(f"You have {total} total task{'s' if total != 1 else ''} "
                             f"({done} completed, {pending} pending).")
        if high_priority > 0:
            summary_parts.append(f"{high_priority} high priority task{'s' if high_priority != 1 else ''} "
                                 f"need{'s' if high_priority == 1 else ''} immediate attention.")
        if overdue > 0:
            summary_parts.append(f"{overdue} task{'s' if overdue != 1 else ''} are overdue.")
        if due_today > 0:
            summary_parts.append(f"{due_today} task{'s' if due_today != 1 else ''} due today.")
        if completed_week > 0:
            summary_parts.append(f"{completed_week} completed this week.")
        if pending_approvals > 0:
            summary_parts.append(f"{pending_approvals} approval{'s' if pending_approvals != 1 else ''} pending review.")

    summary = " ".join(summary_parts)

    logger.info("AI summary generated for user_id=%d: %d insights, %d recommendations",
                current_user.id, len(insights), len(recommendations))

    return {
        "summary": summary,
        "stats": stats,
        "insights": insights,
        "recommendations": recommendations,
    }


def get_ai_history(
    db: Session,
    current_user,
    skip: int = 0,
    limit: int = 50,
):
    logger.debug("Fetching AI history for user_id=%d", current_user.id)
    return (
        db.execute(
            select(AIAnalysis)
            .where(AIAnalysis.user_id == current_user.id)
            .order_by(AIAnalysis.created_at.desc())
            .offset(skip)
            .limit(limit)
        ).scalars().all()
    )
