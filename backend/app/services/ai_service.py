import random
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.ai import AIAnalysis
from app.models.task import Task
from app.core.log import get_logger
from app.core.config import settings
from app.core.cache import cached
from app.schemas.ai import AIRequest

logger = get_logger("ai_service")


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


def generate_suggestion(db: Session, request: AIRequest, current_user):
    logger.info("AI suggestion requested by user_id=%d prompt=%s", current_user.id, request.prompt[:50])

    if request.task_id:
        task = db.query(Task).filter(Task.id == request.task_id).first()
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

    base = _task_base_query(db, current_user)

    total = base.count()
    pending = base.filter(Task.status.in_(["todo", "in_progress"])).count()
    in_review = base.filter(Task.status == "review").count()
    done = base.filter(Task.status == "done").count()
    high_priority = base.filter(
        Task.priority == "high",
        Task.status.in_(["todo", "in_progress"]),
    ).count()
    overdue = base.filter(
        Task.due_date < now,
        Task.status != "done",
    ).count()
    due_today = base.filter(
        func.date(Task.due_date) == func.date(now),
        Task.status != "done",
    ).count()
    completed_week = base.filter(
        Task.status == "done",
        Task.updated_at >= now - timedelta(days=7),
    ).count()

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

    lines = []
    if total == 0:
        lines.append("No tasks found.")
    else:
        lines.append(f"You have {total} total task{'s' if total != 1 else ''}.")

        if pending > 0:
            lines.append(f"{pending} task{'s' if pending != 1 else ''} pending (todo or in progress).")
        if in_review > 0:
            lines.append(f"{in_review} task{'s' if in_review != 1 else ''} in review.")
        if high_priority > 0:
            lines.append(f"{high_priority} high priority task{'s' if high_priority != 1 else ''} pending \u2014 needs attention.")
        if overdue > 0:
            lines.append(f"{overdue} task{'s' if overdue != 1 else ''} overdue.")
        if due_today > 0:
            lines.append(f"{due_today} task{'s' if due_today != 1 else ''} due today.")
        if completed_week > 0:
            lines.append(f"{completed_week} task{'s' if completed_week != 1 else ''} completed this week.")
        if done > 0 and completed_week == 0:
            lines.append(f"{done} task{'s' if done != 1 else ''} completed overall.")

    summary = " ".join(lines)

    logger.info("AI summary generated for user_id=%d: %s", current_user.id, summary[:80])
    return {"summary": summary, "stats": stats}


def get_ai_history(
    db: Session,
    current_user,
    skip: int = 0,
    limit: int = 50,
):
    logger.debug("Fetching AI history for user_id=%d", current_user.id)
    return (
        db.query(AIAnalysis)
        .filter(AIAnalysis.user_id == current_user.id)
        .order_by(AIAnalysis.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
