from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.dashboard_service import (
    get_summary,
    get_task_distribution,
    get_approval_stats,
    get_performance
)
from app.services.ai_service import generate_ai_summary

router = APIRouter(prefix="/dashboard")


@router.get("/summary")
def get_summary_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_view))
):
    return get_summary(db)


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
    user=Depends(require_permission(Permissions.dashboard_performance))
):
    return get_performance(db)


@router.get("/ai-summary")
def ai_summary_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_ai_summary)),
):
    return generate_ai_summary(db, user)
