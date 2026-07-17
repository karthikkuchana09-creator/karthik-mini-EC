from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.schemas.platform.analytics import (
    AnalyticsFilter,
    ProjectsAnalytics,
    TeamsAnalytics,
    TasksAnalytics,
    ApprovalsAnalytics,
    DocumentsAnalytics,
)
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.platform.analytics_service import (
    get_projects_analytics,
    get_teams_analytics,
    get_tasks_analytics,
    get_approvals_analytics,
    get_documents_analytics,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _build_filters(
    workspace_id: Optional[int] = None,
    project_id: Optional[int] = None,
    team_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    f = {}
    if workspace_id:
        f["workspace_id"] = workspace_id
    if project_id:
        f["project_id"] = project_id
    if team_id:
        f["team_id"] = team_id
    if start_date:
        f["start_date"] = start_date
    if end_date:
        f["end_date"] = end_date
    return f


@router.get(
    "/projects",
    response_model=ProjectsAnalytics,
    summary="Projects analytics",
    description="Aggregate project metrics: total, breakdown by status and priority, overdue and near-deadline counts. Supports workspace, date, and team filters.",
)
def projects_analytics_endpoint(
    workspace_id: Optional[int] = Query(None, description="Filter by workspace"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_view)),
):
    return get_projects_analytics(
        db, tenant_id=user.tenant_id,
        filters=_build_filters(workspace_id=workspace_id, start_date=start_date, end_date=end_date),
        user=user,
    )


@router.get(
    "/teams",
    response_model=TeamsAnalytics,
    summary="Teams analytics",
    description="Aggregate team metrics: total teams, total members, average team size, per-team member breakdown. Supports workspace and date filters.",
)
def teams_analytics_endpoint(
    workspace_id: Optional[int] = Query(None, description="Filter by workspace"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_view)),
):
    return get_teams_analytics(
        db, tenant_id=user.tenant_id,
        filters=_build_filters(workspace_id=workspace_id, start_date=start_date, end_date=end_date),
        user=user,
    )


@router.get(
    "/tasks",
    response_model=TasksAnalytics,
    summary="Tasks analytics",
    description="Aggregate task metrics: total, breakdown by status and priority, completed/pending/overdue counts, average completion time. Supports workspace, project, team, and date filters.",
)
def tasks_analytics_endpoint(
    workspace_id: Optional[int] = Query(None, description="Filter by workspace"),
    project_id: Optional[int] = Query(None, description="Filter by project"),
    team_id: Optional[int] = Query(None, description="Filter by team"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_view)),
):
    return get_tasks_analytics(
        db, tenant_id=user.tenant_id,
        filters=_build_filters(
            workspace_id=workspace_id, project_id=project_id,
            team_id=team_id, start_date=start_date, end_date=end_date,
        ),
        user=user,
    )


@router.get(
    "/approvals",
    response_model=ApprovalsAnalytics,
    summary="Approvals analytics",
    description="Aggregate approval metrics: total, breakdown by status, pending by level, average approval time, delayed approvals. Supports workspace and date filters.",
)
def approvals_analytics_endpoint(
    workspace_id: Optional[int] = Query(None, description="Filter by workspace"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_view)),
):
    return get_approvals_analytics(
        db, tenant_id=user.tenant_id,
        filters=_build_filters(workspace_id=workspace_id, start_date=start_date, end_date=end_date),
        user=user,
    )


@router.get(
    "/documents",
    response_model=DocumentsAnalytics,
    summary="Documents analytics",
    description="Aggregate document metrics: total, version count, top uploaders, recent uploads (last 7 days). Supports workspace and date filters.",
)
def documents_analytics_endpoint(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.dashboard_view)),
):
    return get_documents_analytics(
        db, tenant_id=user.tenant_id,
        filters=_build_filters(start_date=start_date, end_date=end_date),
        user=user,
    )
