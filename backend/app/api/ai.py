from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.ai import AIRequest, AIResponse, AIOut, AISummaryOut, HighPriorityTasksOut, DelayRiskOut, AssignmentRecommendRequest, AssignmentRecommendOut, WorkloadAnalysisOut, PerformanceAnalyticsOut, RecommendationsOut
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.ai import AIService
from app.core.log import get_logger

logger = get_logger("ai_api")
router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/suggest", response_model=AIResponse)
def suggest_endpoint(
    request: AIRequest,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).generate_suggestion(request, user)


@router.get("/summary", response_model=AISummaryOut)
def summary_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).generate_summary(user)


@router.get("/recommendations", response_model=RecommendationsOut)
def recommendations_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).get_recommendations()


@router.get("/high-priority-tasks", response_model=HighPriorityTasksOut)
def high_priority_tasks_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    tasks = AIService(db).get_high_priority_tasks(user)
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for t in tasks:
        level = t["urgency_level"]
        counts[level] = counts.get(level, 0) + 1
    return {
        "total": len(tasks),
        "critical": counts.get("critical", 0),
        "high": counts.get("high", 0),
        "medium": counts.get("medium", 0),
        "low": counts.get("low", 0),
        "tasks": tasks,
    }


@router.post("/recommend-assignment", response_model=AssignmentRecommendOut)
def recommend_assignment_endpoint(
    request: AssignmentRecommendRequest,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).recommend_assignment(
        priority=request.priority,
        exclude_user_id=request.exclude_user_id,
    )


@router.get("/performance-analytics", response_model=PerformanceAnalyticsOut)
def performance_analytics_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).get_performance_analytics()


@router.get("/workload-analysis", response_model=WorkloadAnalysisOut)
def workload_analysis_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).get_workload_analysis()


@router.get("/delay-risks", response_model=DelayRiskOut)
def delay_risks_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    items = AIService(db).get_delay_risks(user)
    counts = {"high_risk": 0, "medium_risk": 0, "low_risk": 0}
    for it in items:
        key = f"{it['risk_level']}_risk"
        counts[key] = counts.get(key, 0) + 1
    return {
        "total": len(items),
        "high_risk": counts["high_risk"],
        "medium_risk": counts["medium_risk"],
        "low_risk": counts["low_risk"],
        "items": items,
    }


@router.get("/history", response_model=list[AIOut])
def history_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).get_history(user, skip, limit)
