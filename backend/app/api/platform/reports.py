from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.schemas.platform.report import (
    ReportCreate, ReportUpdate, ReportOut, ReportDataOut, EntityReportDataOut,
)
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.platform.report_service import (
    create_report, get_report, list_reports, update_report, delete_report,
    execute_report, export_report,
    report_projects, report_tasks, report_approvals, report_documents,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


# ---------------------------------------------------------------------------
# Ad-hoc entity reports (MUST be before dynamic /{report_id} routes)
# ---------------------------------------------------------------------------

@router.get(
    "/projects",
    response_model=EntityReportDataOut,
    summary="Projects report",
    description="Ad-hoc projects report with filters. Returns paginated project data grouped by status. Supports workspace, status, priority, and date range filters.",
)
def projects_report_endpoint(
    workspace_id: Optional[int] = Query(None, description="Filter by workspace"),
    status: Optional[str] = Query(None, description="Filter by status (PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED)"),
    priority: Optional[str] = Query(None, description="Filter by priority (LOW, MEDIUM, HIGH, CRITICAL)"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_read)),
):
    return report_projects(
        db, tenant_id=user.tenant_id,
        workspace_id=workspace_id, status=status, priority=priority,
        start_date=start_date, end_date=end_date, page=page, size=size,
    )


@router.get(
    "/tasks",
    response_model=EntityReportDataOut,
    summary="Tasks report",
    description="Ad-hoc tasks report with filters. Returns paginated task data grouped by status. Supports workspace, project, team, status, priority, and date range filters.",
)
def tasks_report_endpoint(
    workspace_id: Optional[int] = Query(None, description="Filter by workspace"),
    project_id: Optional[int] = Query(None, description="Filter by project"),
    team_id: Optional[int] = Query(None, description="Filter by team"),
    status: Optional[str] = Query(None, description="Filter by status (todo, in_progress, review, done)"),
    priority: Optional[str] = Query(None, description="Filter by priority (high, medium, low)"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_read)),
):
    return report_tasks(
        db, tenant_id=user.tenant_id,
        workspace_id=workspace_id, project_id=project_id, team_id=team_id,
        status=status, priority=priority,
        start_date=start_date, end_date=end_date, page=page, size=size,
    )


@router.get(
    "/approvals",
    response_model=EntityReportDataOut,
    summary="Approvals report",
    description="Ad-hoc approvals report with filters. Returns paginated approval data grouped by status. Supports workspace, status, and date range filters.",
)
def approvals_report_endpoint(
    workspace_id: Optional[int] = Query(None, description="Filter by workspace"),
    status: Optional[str] = Query(None, description="Filter by status (pending, approved, rejected, on_hold)"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_read)),
):
    return report_approvals(
        db, tenant_id=user.tenant_id,
        workspace_id=workspace_id, status=status,
        start_date=start_date, end_date=end_date, page=page, size=size,
    )


@router.get(
    "/documents",
    response_model=EntityReportDataOut,
    summary="Documents report",
    description="Ad-hoc documents report with filters. Returns paginated document data. Supports task and date range filters.",
)
def documents_report_endpoint(
    task_id: Optional[int] = Query(None, description="Filter by task"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_read)),
):
    return report_documents(
        db, tenant_id=user.tenant_id,
        task_id=task_id,
        start_date=start_date, end_date=end_date, page=page, size=size,
    )


# ---------------------------------------------------------------------------
# Saved report CRUD
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=ReportOut,
    summary="Create saved report",
    description="Create a saved report configuration with filters, grouping, and aggregations. Requires report:create permission.",
)
def create_report_endpoint(
    data: ReportCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_create)),
):
    return create_report(db, data, user, tenant_id=user.tenant_id)


@router.get(
    "",
    response_model=Page[ReportOut],
    summary="List saved reports",
    description="Retrieve all saved reports. Requires report:read permission.",
)
def list_reports_endpoint(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_read)),
):
    return list_reports(db, tenant_id=user.tenant_id, page=page, size=size)


@router.get(
    "/{report_id}",
    response_model=ReportOut,
    summary="Get saved report",
    description="Retrieve a saved report configuration by ID. Requires report:read permission.",
)
def get_report_endpoint(
    report_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_read)),
):
    return get_report(db, report_id, tenant_id=user.tenant_id)


@router.put(
    "/{report_id}",
    response_model=ReportOut,
    summary="Update saved report",
    description="Update a saved report's title, description, or config. Requires report:update permission.",
)
def update_report_endpoint(
    report_id: int,
    data: ReportUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_update)),
):
    return update_report(db, report_id, data, user, tenant_id=user.tenant_id)


@router.delete(
    "/{report_id}",
    summary="Delete saved report",
    description="Delete a saved report. Requires report:delete permission.",
)
def delete_report_endpoint(
    report_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_delete)),
):
    return delete_report(db, report_id, user, tenant_id=user.tenant_id)


# ---------------------------------------------------------------------------
# Saved report execution
# ---------------------------------------------------------------------------

@router.get(
    "/{report_id}/data",
    response_model=ReportDataOut,
    summary="Execute saved report",
    description="Execute a saved report and return the data with columns, rows, summary, and chart data. Requires report:read permission.",
)
def get_report_data_endpoint(
    report_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_read)),
):
    return execute_report(db, report_id, tenant_id=user.tenant_id, user=user)


@router.get(
    "/{report_id}/export",
    summary="Export saved report",
    description="Export a saved report as CSV or JSON. Requires report:read permission.",
)
def export_report_endpoint(
    report_id: int,
    format: str = Query("csv", pattern="^(csv|json)$"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.report_read)),
):
    content, media_type, filename = export_report(db, report_id, format, tenant_id=user.tenant_id, user=user)
    return Response(content=content, media_type=media_type, headers={"Content-Disposition": f"attachment; filename={filename}"})
