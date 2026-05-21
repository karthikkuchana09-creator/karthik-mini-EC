from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.tenant import get_current_tenant_id, require_active_tenant
from app.models.user import User
from app.services.usage_analytics_service import UsageAnalyticsService
from app.core.log import get_logger

logger = get_logger("usage_api")
router = APIRouter(prefix="/usage", tags=["Usage Analytics"])


def _get_org_id(request: Request, user: User) -> int:
    return user.tenant_id or get_current_tenant_id(request) or require_active_tenant(request)


@router.get("/credits")
def get_credit_usage(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    return UsageAnalyticsService.get_credit_usage(db, org_id)


@router.get("/analytics")
def get_comprehensive_analytics(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    return UsageAnalyticsService.get_comprehensive_analytics(db, org_id)


@router.get("/api")
def get_api_usage(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    return UsageAnalyticsService.get_api_usage(db, org_id)


@router.get("/storage")
def get_storage_usage(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    return UsageAnalyticsService.get_storage_usage(db, org_id)


@router.get("/ai")
def get_ai_usage(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    return UsageAnalyticsService.get_ai_usage(db, org_id)
