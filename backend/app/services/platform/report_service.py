from typing import Optional
from datetime import datetime, date
from fastapi import HTTPException
from sqlalchemy import select, func, desc, asc
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.platform.report import Report
from app.models.task import Task
from app.models.project import Project
from app.models.approval import Approval
from app.models.document import Document
from app.models.user import User
from app.core.tenant import tenant_filter
from app.services.enterprise_audit_service import (
    log_report_create, log_report_update, log_report_delete, log_report_execute,
)
from app.core.cache import cached, invalidate
from app.core.config import settings

ENTITY_MODELS = {
    "task": Task,
    "project": Project,
    "approval": Approval,
    "document": Document,
    "user": User,
}


@invalidate(patterns=["report:*"])
def create_report(db: Session, data, user, tenant_id: int | None = None):
    report = Report(
        title=data.title,
        description=data.description,
        entity_type=data.entity_type,
        config=data.config,
        created_by=user.id,
        is_shared=data.is_shared,
        tenant_id=tenant_id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    log_report_create(db, user.id, report.id, {"title": report.title, "entity_type": report.entity_type})
    return report


def get_report(db: Session, report_id: int, tenant_id: int | None = None):
    report = db.scalar(
        tenant_filter(select(Report), Report, tenant_id)
        .where(Report.id == report_id)
    )
    if not report:
        raise HTTPException(404, "Report not found")
    return report


def list_reports(db: Session, tenant_id: int | None = None, page: int = 1, size: int = 20):
    query = tenant_filter(select(Report), Report, tenant_id).order_by(Report.updated_at.desc())
    return paginate(db, query)


@invalidate(patterns=["report:*"])
def update_report(db: Session, report_id: int, data, user, tenant_id: int | None = None):
    report = get_report(db, report_id, tenant_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        if val is not None:
            setattr(report, key, val)
    db.commit()
    db.refresh(report)
    log_report_update(db, user.id, report_id, None, {"title": report.title})
    return report


@invalidate(patterns=["report:*"])
def delete_report(db: Session, report_id: int, user, tenant_id: int | None = None):
    report = get_report(db, report_id, tenant_id)
    db.delete(report)
    db.commit()
    log_report_delete(db, user.id, report_id, {"title": report.title})
    return {"message": "Report deleted"}


@cached(prefix="report:execute", ttl=lambda: settings.CACHE_TTL_REPORT, exclude_args=[0])
def execute_report(db: Session, report_id: int, tenant_id: int | None = None, user=None):
    report = get_report(db, report_id, tenant_id)
    config = report.config or {}
    model = ENTITY_MODELS.get(report.entity_type)
    if not model:
        raise HTTPException(400, f"Unsupported entity type: {report.entity_type}")

    stmt = select(model)
    if hasattr(model, "tenant_id"):
        stmt = tenant_filter(stmt, model, tenant_id)

    filters = config.get("filters", {})
    for field, value in filters.items():
        if value is not None and hasattr(model, field):
            col = getattr(model, field)
            stmt = stmt.where(col == value)

    date_field = config.get("date_field")
    date_from = config.get("date_from")
    date_to = config.get("date_to")
    if date_field and (date_from or date_to) and hasattr(model, date_field):
        col = getattr(model, date_field)
        if date_from:
            stmt = stmt.where(col >= date_from)
        if date_to:
            stmt = stmt.where(col <= date_to)

    if config.get("search") and hasattr(model, "title"):
        stmt = stmt.where(model.title.ilike(f"%{config['search']}%"))

    group_by = config.get("group_by")
    aggregations = config.get("aggregations", [])
    columns = config.get("columns", [])

    if group_by and hasattr(model, group_by):
        group_col = getattr(model, group_by)
        agg_cols = [group_col, func.count().label("count")]
        for agg in aggregations:
            agg_field = agg.get("field")
            agg_type = agg.get("type", "count")
            if agg_field and hasattr(model, agg_field):
                field_col = getattr(model, agg_field)
                if agg_type == "sum":
                    agg_cols.append(func.coalesce(func.sum(field_col), 0).label(f"{agg_field}_sum"))
                elif agg_type == "avg":
                    agg_cols.append(func.coalesce(func.avg(field_col), 0).label(f"{agg_field}_avg"))
                elif agg_type == "max":
                    agg_cols.append(func.coalesce(func.max(field_col), 0).label(f"{agg_field}_max"))
                elif agg_type == "min":
                    agg_cols.append(func.coalesce(func.min(field_col), 0).label(f"{agg_field}_min"))
        stmt = select(*agg_cols).select_from(stmt.subquery()).group_by(group_col)
        stmt = stmt.order_by(group_col)
        rows = db.execute(stmt).all()
        result_rows = [r._asdict() for r in rows]
        chart_data = {"labels": [r.get(group_by, "") for r in result_rows], "values": [r.get("count", 0) for r in result_rows]}
        summary = {"total_groups": len(result_rows), "total_count": sum(r.get("count", 0) for r in result_rows)}
    else:
        if columns:
            selected = []
            for col_name in columns:
                if hasattr(model, col_name):
                    selected.append(getattr(model, col_name))
            if selected:
                stmt = select(*selected)
                if hasattr(model, "tenant_id"):
                    stmt = tenant_filter(stmt, model, tenant_id)
        sort_by = config.get("sort_by")
        sort_order = config.get("sort_order", "desc")
        if sort_by and hasattr(model, sort_by):
            order_fn = desc if sort_order == "desc" else asc
            stmt = stmt.order_by(order_fn(getattr(model, sort_by)))

        limit = config.get("limit", 100)
        stmt = stmt.limit(limit)
        rows = db.execute(stmt).all()
        result_rows = [dict(r._mapping) for r in rows]
        chart_data = None
        summary = {"total_rows": len(result_rows)}

    uid = user.id if user else 0
    log_report_execute(db, uid, report_id, report.entity_type, summary)

    return {
        "report_id": report.id,
        "title": report.title,
        "entity_type": report.entity_type,
        "columns": columns or [c.name for c in model.__table__.columns if not c.name.startswith("_")],
        "rows": result_rows,
        "summary": summary,
        "chart_data": chart_data,
    }


def export_report(db: Session, report_id: int, fmt: str, tenant_id: int | None = None, user=None):
    data = execute_report(db, report_id, tenant_id, user)
    if fmt == "csv":
        import csv, io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(data["columns"])
        for row in data["rows"]:
            writer.writerow([row.get(c, "") for c in data["columns"]])
        return output.getvalue(), "text/csv", f"report_{report_id}.csv"
    elif fmt == "json":
        import json
        content = json.dumps(data, indent=2, default=str)
        return content, "application/json", f"report_{report_id}.json"
    else:
        raise HTTPException(400, "Unsupported format. Use csv or json.")


# ---------------------------------------------------------------------------
# Ad-hoc entity report helpers
# ---------------------------------------------------------------------------

def _apply_date_filter(stmt, model, start_date, end_date):
    if start_date and hasattr(model, "created_at"):
        stmt = stmt.where(model.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date and hasattr(model, "created_at"):
        stmt = stmt.where(model.created_at <= datetime.combine(end_date, datetime.max.time()))
    return stmt


def _apply_model_filters(stmt, model, filters: dict):
    for field, value in filters.items():
        if value is not None and hasattr(model, field):
            stmt = stmt.where(getattr(model, field) == value)
    return stmt


def _build_report_response(entity_type: str, columns: list, rows: list, total: int, page: int, size: int, summary: dict | None = None):
    return {
        "entity_type": entity_type,
        "columns": columns,
        "rows": rows,
        "summary": summary,
        "page": page,
        "size": size,
        "total": total,
    }


PROJECT_COLUMNS = ["id", "name", "status", "priority", "start_date", "due_date", "created_by", "created_at", "updated_at"]


@cached(prefix="report:projects", ttl=lambda: settings.CACHE_TTL_REPORT, exclude_args=[0])
def report_projects(
    db: Session,
    tenant_id: int | None = None,
    workspace_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    size: int = 20,
):
    stmt = select(Project)
    if hasattr(Project, "tenant_id"):
        stmt = tenant_filter(stmt, Project, tenant_id)
    stmt = _apply_model_filters(stmt, Project, {
        "workspace_id": workspace_id,
        "status": status,
        "priority": priority,
    })
    stmt = _apply_date_filter(stmt, Project, start_date, end_date)

    total = db.scalar(stmt.with_only_columns(func.count(Project.id)).order_by(None)) or 0
    stmt = stmt.order_by(Project.updated_at.desc()).offset((page - 1) * size).limit(size)
    rows = db.execute(stmt).scalars().all()

    result = []
    for r in rows:
        result.append({
            "id": r.id,
            "name": r.name,
            "status": r.status.value if hasattr(r.status, "value") else r.status,
            "priority": r.priority.value if hasattr(r.priority, "value") else r.priority,
            "start_date": str(r.start_date) if r.start_date else None,
            "due_date": str(r.due_date) if r.due_date else None,
            "created_by": r.created_by,
            "created_at": str(r.created_at),
            "updated_at": str(r.updated_at),
        })

    by_status = {}
    for r in result:
        s = r["status"] or "unknown"
        by_status[s] = by_status.get(s, 0) + 1

    return _build_report_response("project", PROJECT_COLUMNS, result, total, page, size, {"by_status": by_status})


TASK_COLUMNS = ["id", "title", "status", "priority", "assigned_to_id", "created_by_id", "due_date", "project_id", "team_id", "created_at", "updated_at"]


@cached(prefix="report:tasks", ttl=lambda: settings.CACHE_TTL_REPORT, exclude_args=[0])
def report_tasks(
    db: Session,
    tenant_id: int | None = None,
    workspace_id: int | None = None,
    project_id: int | None = None,
    team_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    size: int = 20,
):
    stmt = select(Task)
    if hasattr(Task, "tenant_id"):
        stmt = tenant_filter(stmt, Task, tenant_id)
    stmt = _apply_model_filters(stmt, Task, {
        "workspace_id": workspace_id,
        "project_id": project_id,
        "team_id": team_id,
        "status": status,
        "priority": priority,
    })
    stmt = _apply_date_filter(stmt, Task, start_date, end_date)

    total = db.scalar(stmt.with_only_columns(func.count(Task.id)).order_by(None)) or 0
    stmt = stmt.order_by(Task.updated_at.desc()).offset((page - 1) * size).limit(size)
    rows = db.execute(stmt).scalars().all()

    result = []
    for r in rows:
        result.append({
            "id": r.id,
            "title": r.title,
            "status": r.status,
            "priority": r.priority,
            "assigned_to_id": r.assigned_to_id,
            "created_by_id": r.created_by_id,
            "due_date": str(r.due_date) if r.due_date else None,
            "project_id": r.project_id,
            "team_id": r.team_id,
            "created_at": str(r.created_at),
            "updated_at": str(r.updated_at),
        })

    by_status = {}
    for r in result:
        s = r["status"] or "unknown"
        by_status[s] = by_status.get(s, 0) + 1

    return _build_report_response("task", TASK_COLUMNS, result, total, page, size, {"by_status": by_status})


APPROVAL_COLUMNS = ["id", "title", "status", "current_level", "requested_by", "is_escalated", "created_at", "updated_at"]


@cached(prefix="report:approvals", ttl=lambda: settings.CACHE_TTL_REPORT, exclude_args=[0])
def report_approvals(
    db: Session,
    tenant_id: int | None = None,
    workspace_id: int | None = None,
    status: str | None = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    size: int = 20,
):
    stmt = select(Approval)
    if hasattr(Approval, "tenant_id"):
        stmt = tenant_filter(stmt, Approval, tenant_id)
    stmt = _apply_model_filters(stmt, Approval, {
        "workspace_id": workspace_id,
        "status": status,
    })
    stmt = _apply_date_filter(stmt, Approval, start_date, end_date)

    total = db.scalar(stmt.with_only_columns(func.count(Approval.id)).order_by(None)) or 0
    stmt = stmt.order_by(Approval.updated_at.desc()).offset((page - 1) * size).limit(size)
    rows = db.execute(stmt).scalars().all()

    result = []
    for r in rows:
        result.append({
            "id": r.id,
            "title": r.title,
            "status": r.status,
            "current_level": r.current_level,
            "requested_by": r.requested_by,
            "is_escalated": r.is_escalated,
            "created_at": str(r.created_at),
            "updated_at": str(r.updated_at),
        })

    by_status = {}
    for r in result:
        s = r["status"] or "unknown"
        by_status[s] = by_status.get(s, 0) + 1

    return _build_report_response("approval", APPROVAL_COLUMNS, result, total, page, size, {"by_status": by_status})


DOCUMENT_COLUMNS = ["id", "file_name", "version", "uploaded_by", "task_id", "created_at"]


@cached(prefix="report:documents", ttl=lambda: settings.CACHE_TTL_REPORT, exclude_args=[0])
def report_documents(
    db: Session,
    tenant_id: int | None = None,
    task_id: int | None = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    size: int = 20,
):
    stmt = select(Document)
    if hasattr(Document, "tenant_id"):
        stmt = tenant_filter(stmt, Document, tenant_id)
    stmt = _apply_model_filters(stmt, Document, {
        "task_id": task_id,
    })
    stmt = _apply_date_filter(stmt, Document, start_date, end_date)

    total = db.scalar(stmt.with_only_columns(func.count(Document.id)).order_by(None)) or 0
    stmt = stmt.order_by(Document.created_at.desc()).offset((page - 1) * size).limit(size)
    rows = db.execute(stmt).scalars().all()

    result = []
    for r in rows:
        result.append({
            "id": r.id,
            "file_name": r.file_name,
            "version": r.version,
            "uploaded_by": r.uploaded_by,
            "task_id": r.task_id,
            "created_at": str(r.created_at),
        })

    return _build_report_response("document", DOCUMENT_COLUMNS, result, total, page, size)
