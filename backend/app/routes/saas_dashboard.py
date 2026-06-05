from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.routes.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.saas_dashboard import (
    SaasSummaryResponse,
    TenantGrowthItem,
    UsageItem,
    TopTenantItem,
)
from app.services.saas_dashboard_service import SaasDashboardService
from app.core.log import get_logger

logger = get_logger("saas_dashboard_api")
router = APIRouter(prefix="/saas/dashboard", tags=["SaaS Admin Dashboard"])


def _require_super_admin(user: User) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can access this resource",
        )
    return user


def _require_super_admin_dep(
    user: User = Depends(get_current_user),
) -> User:
    return _require_super_admin(user)


@router.get("/summary", response_model=SaasSummaryResponse)
def get_summary(
    db: Session = Depends(get_db),
    _: User = Depends(_require_super_admin_dep),
):
    return SaasDashboardService.get_summary(db)


@router.get("/tenant-growth", response_model=list[TenantGrowthItem])
def get_tenant_growth(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db),
    _: User = Depends(_require_super_admin_dep),
):
    return SaasDashboardService.get_tenant_growth(db, days)


@router.get("/usage", response_model=list[UsageItem])
def get_usage(
    db: Session = Depends(get_db),
    _: User = Depends(_require_super_admin_dep),
):
    return SaasDashboardService.get_usage(db)


@router.get("/top-tenants", response_model=Page[TopTenantItem])
def get_top_tenants(
    db: Session = Depends(get_db),
    _: User = Depends(_require_super_admin_dep),
):
    return SaasDashboardService.get_top_tenants(db)
