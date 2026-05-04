from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.services.dashboard_service import (
    get_summary,
    get_task_distribution,
    get_approval_stats,
    get_performance
)

router = APIRouter(prefix="/dashboard")

@router.get("/summary")
def get_summary_endpoint(db: Session = Depends(get_db)):
    return get_summary(db)


@router.get("/task-distribution")
def task_distribution_endpoint(db: Session = Depends(get_db)):
    return get_task_distribution(db)

@router.get("/approvals")
def approval_stats_endpoint(db: Session = Depends(get_db)):
    return get_approval_stats(db)

@router.get("/performance")
def performance_endpoint(db: Session = Depends(get_db)):
    return get_performance(db) 