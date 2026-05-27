from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.routes.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.organization import OrganizationResponse
from app.repository.super_admin_repository import (
    list_all_orgs_for_admin,
    list_all_subs_for_admin,
    list_all_users_for_admin,
)
from app.services.super_admin_service import SuperAdminService
from app.core.log import get_logger
from fastapi import HTTPException, status

logger = get_logger("super_admin_api")
router = APIRouter(prefix="/admin", tags=["Super Admin"])


def _require_super_admin(user: User):
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can access this resource",
        )
    return user


@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return SuperAdminService.get_comprehensive_dashboard(db)


@router.get("/organizations", response_model=Page[OrganizationResponse])
def get_org_overview(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return list_all_orgs_for_admin(db)


@router.get("/organizations/signups")
def get_signups_trend(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return SuperAdminService.get_signups_trend(db, days)


@router.get("/organizations/plan-distribution")
def get_plan_distribution(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return SuperAdminService.get_plan_distribution(db)


@router.get("/revenue")
def get_revenue(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return SuperAdminService.get_revenue_summary(db)


@router.get("/revenue/by-month")
def get_revenue_by_month(
    months: int = Query(12, ge=1, le=60),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return SuperAdminService.get_revenue_by_month(db, months)


@router.get("/subscriptions")
def get_subscriptions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return list_all_subs_for_admin(db)


@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return list_all_users_for_admin(db)


@router.get("/users/trend")
def get_user_trend(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return SuperAdminService.get_active_users_trend(db, days)


@router.get("/api-usage")
def get_api_usage(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return SuperAdminService.get_api_usage_stats(db)


@router.get("/ai-usage")
def get_ai_usage(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return SuperAdminService.get_ai_usage_stats(db)


@router.get("/ai-usage/trend")
def get_ai_trend(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_super_admin(user)
    return SuperAdminService.get_ai_trend(db, days)
