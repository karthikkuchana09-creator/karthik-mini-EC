import asyncio
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.ai import AIRequest, AIResponse, AIOut, AISummaryOut, HighPriorityTasksOut, DelayRiskOut, AssignmentRecommendRequest, AssignmentRecommendOut, WorkloadAnalysisOut, PerformanceAnalyticsOut, RecommendationsOut, EmployeeProductivityOut
from app.services.dashboard_service import get_enterprise_ai_summary
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.ai import AIService
from app.core.log import get_logger
from app.ai.cache import AICacheService
from app.services.ai_jobs import get_ai_job_status, run_ai_jobs

logger = get_logger("ai_api")
router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/analytics-dashboard")
def analytics_dashboard_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
    use_cache: bool = Query(True, description="Use cached response if available"),
):
    if use_cache:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        cached = loop.run_until_complete(
            AICacheService.get_or_compute(
                AICacheService.key("dashboard", "summary"),
                AICacheService.CACHE_TTL["dashboard"],
                _compute_dashboard_summary,
                db, user,
            )
        )
        loop.close()
        return cached

    return _compute_dashboard_summary(db, user)


def _compute_dashboard_summary(db: Session, user) -> dict:
    svc = AIService(db)
    summary = get_enterprise_ai_summary(db)
    high_priority = svc.get_high_priority_tasks(user)
    delay_risks = svc.get_delay_risks(user)
    workload = svc.get_workload_analysis()
    performance = svc.get_performance_analytics()
    recommendations = svc.get_recommendations()
    return {
        "summary": summary["summary"],
        "high_priority_tasks": {
            "total": len(high_priority),
            "critical": sum(1 for t in high_priority if t["urgency_level"] == "critical"),
            "high": sum(1 for t in high_priority if t["urgency_level"] == "high"),
            "medium": sum(1 for t in high_priority if t["urgency_level"] == "medium"),
            "tasks": high_priority[:8],
        },
        "delay_risks": {
            "total": len(delay_risks),
            "high_risk": sum(1 for r in delay_risks if r["risk_level"] == "high"),
            "medium_risk": sum(1 for r in delay_risks if r["risk_level"] == "medium"),
            "items": delay_risks[:6],
        },
        "workload": {
            "team_balance": workload["team_balance"],
            "distribution": workload["distribution"],
            "employees": workload["employees"][:10],
        },
        "performance": {
            "team_avg_completion_days": performance["team_avg_completion_days"],
            "team_delay_pct": performance["team_delay_pct"],
            "team_avg_performance": performance["team_avg_performance"],
            "team_avg_reliability": performance["team_avg_reliability"],
            "top_performers": performance["top_performers"],
            "monthly_trends": _build_monthly_trends(performance.get("users", [])),
        },
        "recommendations": recommendations["recommendations"][:8],
    }


def _build_monthly_trends(users: list) -> dict:
    agg = {}
    for u in users:
        for t in u.get("monthly_trends", []):
            m = t["month"]
            if m not in agg:
                agg[m] = {"completed": 0, "total_days": 0.0, "count": 0}
            agg[m]["completed"] += t.get("completed", 0)
            if t.get("avg_completion_days"):
                agg[m]["total_days"] += t["avg_completion_days"]
                agg[m]["count"] += 1
    months = sorted(agg.keys())
    return [
        {
            "month": m,
            "completed": agg[m]["completed"],
            "avg_completion_days": round(agg[m]["total_days"] / agg[m]["count"], 1) if agg[m]["count"] else None,
        }
        for m in months
    ]


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


@router.get("/employee-productivity", response_model=EmployeeProductivityOut)
def employee_productivity_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).get_employee_productivity()


@router.get("/team-intelligence")
def team_intelligence_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).get_team_intelligence()


@router.get("/history", response_model=list[AIOut])
def history_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).get_history(user, skip, limit)


@router.get("/cache/status")
def cache_status_endpoint(
    user=Depends(require_permission(Permissions.admin)),
):
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    stats = loop.run_until_complete(AICacheService.get_cache_stats())
    loop.close()
    return stats


@router.post("/cache/warm")
def cache_warm_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.admin)),
):
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(AICacheService.warm_ai_caches(db))
    loop.close()
    return result


@router.post("/cache/invalidate")
def cache_invalidate_endpoint(
    user=Depends(require_permission(Permissions.admin)),
):
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    count = loop.run_until_complete(AICacheService.invalidate_ai_caches())
    loop.close()
    return {"invalidated": count}


@router.get("/jobs/status")
def jobs_status_endpoint(
    user=Depends(require_permission(Permissions.admin)),
):
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    status = loop.run_until_complete(get_ai_job_status())
    loop.close()
    return status


@router.post("/jobs/run")
def jobs_run_endpoint(
    full: bool = Query(False, description="Run full daily job"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.admin)),
):
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(run_ai_jobs(db, full=full))
    loop.close()
    return result
