from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.core.subscription_access import require_feature
from app.core.credit_access import require_credits, deduct_feature_credits
from app.services.dashboard_service import (
    get_summary,
    get_task_distribution,
    get_approval_stats,
    get_performance,
    get_enterprise_ai_summary,
)

router = APIRouter(prefix="/dashboard")


@router.get("/summary")
def get_summary_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_view))
):
    return get_summary(db, user_id=user.id)


@router.get("/task-distribution")
def task_distribution_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_view))
):
    return get_task_distribution(db)


@router.get("/approvals")
def approval_stats_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_view))
):
    return get_approval_stats(db)


@router.get("/performance")
def performance_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_performance)),
    _=Depends(require_feature("analytics")),
    _credits=Depends(require_credits("analytics_generation")),
):
    result = get_performance(db)
    deduct_feature_credits(db, user, "analytics_generation")
    return result


@router.get("/ai-summary")
def ai_summary_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_ai_summary)),
    _=Depends(require_feature("analytics")),
    _credits=Depends(require_credits("ai_summary")),
):
    result = get_enterprise_ai_summary(db)
    deduct_feature_credits(db, user, "ai_summary")
    return result
