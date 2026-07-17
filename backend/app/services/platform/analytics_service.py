from datetime import datetime, timedelta, date
from sqlalchemy import select, func, case, and_
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.project import Project, ProjectStatus
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.approval import Approval
from app.models.document import Document
from app.models.user import User
from app.core.tenant import tenant_filter
from app.core.cache import cached
from app.core.config import settings
from app.core.log import get_logger
from app.services.enterprise_audit_service import log_analytics_request

logger = get_logger("analytics_service")

TASK_DONE = "done"
APPROVAL_PENDING = "pending"


def _apply_filters(stmt, model, filters: dict | None = None):
    if not filters:
        return stmt
    if filters.get("workspace_id") and hasattr(model, "workspace_id"):
        stmt = stmt.where(model.workspace_id == filters["workspace_id"])
    if filters.get("project_id") and hasattr(model, "project_id"):
        stmt = stmt.where(model.project_id == filters["project_id"])
    if filters.get("team_id") and hasattr(model, "team_id"):
        stmt = stmt.where(model.team_id == filters["team_id"])
    if filters.get("start_date") and hasattr(model, "created_at"):
        stmt = stmt.where(model.created_at >= datetime.combine(filters["start_date"], datetime.min.time()))
    if filters.get("end_date") and hasattr(model, "created_at"):
        stmt = stmt.where(model.created_at <= datetime.combine(filters["end_date"], datetime.max.time()))
    return stmt


def _model_has_tenant(model) -> bool:
    return hasattr(model, "tenant_id")


# ---------------------------------------------------------------------------
# Projects Analytics
# ---------------------------------------------------------------------------

@cached(prefix="analytics:projects", ttl=lambda: settings.CACHE_TTL_DASHBOARD, exclude_args=[0])
def get_projects_analytics(db: Session, tenant_id: int | None = None, filters: dict | None = None, user=None):
    base = select(Project)
    if _model_has_tenant(Project):
        base = tenant_filter(base, Project, tenant_id)
    base = _apply_filters(base, Project, filters)

    total = db.scalar(base.with_only_columns(func.count(Project.id)))

    status_rows = db.execute(
        base.with_only_columns(Project.status, func.count(Project.id).label("c"))
        .group_by(Project.status)
    ).all()
    by_status = [StatusCount(status=r.status, count=r.c) for r in status_rows]

    priority_rows = db.execute(
        base.with_only_columns(Project.priority, func.count(Project.id).label("c"))
        .group_by(Project.priority)
    ).all()
    by_priority = [PriorityCount(priority=r.priority, count=r.c) for r in priority_rows if r.priority]

    now = datetime.now()
    overdue = db.scalar(
        base.where(Project.due_date < now, Project.status != ProjectStatus.COMPLETED.value)
        .with_only_columns(func.count(Project.id))
    )
    near_deadline = db.scalar(
        base.where(
            Project.due_date >= now,
            Project.due_date <= now + timedelta(days=7),
            Project.status != ProjectStatus.COMPLETED.value,
        ).with_only_columns(func.count(Project.id))
    )

    if user:
        log_analytics_request(db, user.id, "projects", filters)

    return {
        "total": total or 0,
        "by_status": [{"status": r.status or "unknown", "count": r.c} for r in status_rows],
        "by_priority": [{"priority": r.priority or "none", "count": r.c} for r in priority_rows if r.priority],
        "overdue": overdue or 0,
        "near_deadline": near_deadline or 0,
    }


# ---------------------------------------------------------------------------
# Teams Analytics
# ---------------------------------------------------------------------------

@cached(prefix="analytics:teams", ttl=lambda: settings.CACHE_TTL_DASHBOARD, exclude_args=[0])
def get_teams_analytics(db: Session, tenant_id: int | None = None, filters: dict | None = None, user=None):
    base = select(Team)
    if _model_has_tenant(Team):
        base = tenant_filter(base, Team, tenant_id)
    base = _apply_filters(base, Team, filters)

    total = db.scalar(base.with_only_columns(func.count(Team.id))) or 0

    teams = db.execute(base).scalars().all()
    team_ids = [t.id for t in teams]

    member_counts = {}
    if team_ids:
        member_query = select(TeamMember.team_id, func.count(TeamMember.id).label("c")).where(
            TeamMember.team_id.in_(team_ids)
        )
        if tenant_id:
            member_query = member_query.where(TeamMember.tenant_id == tenant_id)
        count_rows = db.execute(member_query.group_by(TeamMember.team_id)).all()
        member_counts = {r.team_id: r.c for r in count_rows}

    team_list = []
    total_members = 0
    for t in teams:
        mc = member_counts.get(t.id, 0)
        total_members += mc
        team_list.append({"id": t.id, "name": t.name, "member_count": mc})

    avg_team_size = round(total_members / total, 1) if total > 0 else 0.0

    if user:
        log_analytics_request(db, user.id, "teams", filters)

    return {
        "total": total,
        "total_members": total_members,
        "avg_team_size": avg_team_size,
        "teams": team_list,
    }


# ---------------------------------------------------------------------------
# Tasks Analytics
# ---------------------------------------------------------------------------

@cached(prefix="analytics:tasks", ttl=lambda: settings.CACHE_TTL_DASHBOARD, exclude_args=[0])
def get_tasks_analytics(db: Session, tenant_id: int | None = None, filters: dict | None = None, user=None):
    base = select(Task)
    if _model_has_tenant(Task):
        base = tenant_filter(base, Task, tenant_id)
    base = _apply_filters(base, Task, filters)

    total = db.scalar(base.with_only_columns(func.count(Task.id))) or 0

    status_rows = db.execute(
        base.with_only_columns(Task.status, func.count(Task.id).label("c"))
        .group_by(Task.status)
    ).all()
    by_status = [{"status": r.status or "unknown", "count": r.c} for r in status_rows]

    priority_rows = db.execute(
        base.with_only_columns(Task.priority, func.count(Task.id).label("c"))
        .group_by(Task.priority)
    ).all()
    by_priority = [{"priority": r.priority or "none", "count": r.c} for r in priority_rows]

    completed = db.scalar(
        base.where(Task.status == TASK_DONE).with_only_columns(func.count(Task.id))
    ) or 0
    pending = total - completed

    now = datetime.now()
    overdue = db.scalar(
        base.where(
            Task.due_date < now,
            Task.status != TASK_DONE,
        ).with_only_columns(func.count(Task.id))
    ) or 0

    avg_time = db.scalar(
        select(func.avg(
            func.timestampdiff(func.text("HOUR"), Task.created_at, Task.updated_at)
        )).where(Task.status == TASK_DONE)
    )

    if user:
        log_analytics_request(db, user.id, "tasks", filters)

    return {
        "total": total,
        "by_status": by_status,
        "by_priority": by_priority,
        "completed": completed,
        "pending": pending,
        "overdue": overdue,
        "avg_completion_time_hours": round(float(avg_time), 1) if avg_time else None,
    }


# ---------------------------------------------------------------------------
# Approvals Analytics
# ---------------------------------------------------------------------------

@cached(prefix="analytics:approvals", ttl=lambda: settings.CACHE_TTL_DASHBOARD, exclude_args=[0])
def get_approvals_analytics(db: Session, tenant_id: int | None = None, filters: dict | None = None, user=None):
    base = select(Approval)
    if _model_has_tenant(Approval):
        base = tenant_filter(base, Approval, tenant_id)
    base = _apply_filters(base, Approval, filters)

    total = db.scalar(base.with_only_columns(func.count(Approval.id))) or 0

    status_rows = db.execute(
        base.with_only_columns(Approval.status, func.count(Approval.id).label("c"))
        .group_by(Approval.status)
    ).all()
    by_status = [{"status": r.status or "unknown", "count": r.c} for r in status_rows]

    pending = db.scalar(
        base.where(Approval.status == APPROVAL_PENDING).with_only_columns(func.count(Approval.id))
    ) or 0

    level_rows = db.execute(
        base.where(Approval.status == APPROVAL_PENDING)
        .with_only_columns(Approval.current_level, func.count(Approval.id).label("c"))
        .group_by(Approval.current_level)
    ).all()
    pending_by_level = [{"status": r.current_level or "unknown", "count": r.c} for r in level_rows]

    avg_time = db.scalar(
        select(func.avg(
            func.timestampdiff(func.text("HOUR"), Approval.created_at, Approval.updated_at)
        )).where(Approval.status.in_(["approved", "rejected"]))
    )

    delayed = db.scalar(
        base.where(
            and_(
                Approval.status == APPROVAL_PENDING,
                Approval.created_at < datetime.now() - timedelta(hours=24),
            )
        ).with_only_columns(func.count(Approval.id))
    ) or 0

    if user:
        log_analytics_request(db, user.id, "approvals", filters)

    return {
        "total": total,
        "by_status": by_status,
        "pending": pending,
        "pending_by_level": pending_by_level,
        "avg_approval_time_hours": round(float(avg_time), 1) if avg_time else None,
        "delayed": delayed,
    }


# ---------------------------------------------------------------------------
# Documents Analytics
# ---------------------------------------------------------------------------

@cached(prefix="analytics:documents", ttl=lambda: settings.CACHE_TTL_DASHBOARD, exclude_args=[0])
def get_documents_analytics(db: Session, tenant_id: int | None = None, filters: dict | None = None, user=None):
    base = select(Document)
    if _model_has_tenant(Document):
        base = tenant_filter(base, Document, tenant_id)
    base = _apply_filters(base, Document, filters)

    total = db.scalar(base.with_only_columns(func.count(Document.id))) or 0

    total_versions = db.scalar(base.with_only_columns(func.sum(Document.version))) or 0

    uploader_rows = db.execute(
        base.with_only_columns(
            Document.uploaded_by,
            func.count(Document.id).label("c"),
        ).group_by(Document.uploaded_by).limit(10)
    ).all()

    uploader_ids = [r.uploaded_by for r in uploader_rows if r.uploaded_by]
    user_map = {}
    if uploader_ids:
        user_query = select(User).where(User.id.in_(uploader_ids))
        if tenant_id:
            user_query = user_query.where(User.tenant_id == tenant_id)
        users = db.execute(user_query).scalars().all()
        user_map = {u.id: u.name for u in users}

    by_uploader = []
    for r in uploader_rows:
        by_uploader.append({
            "user_id": r.uploaded_by,
            "user_name": user_map.get(r.uploaded_by, "Unknown"),
            "count": r.c,
        })

    week_ago = datetime.now() - timedelta(days=7)
    recent = db.scalar(
        base.where(Document.created_at >= week_ago).with_only_columns(func.count(Document.id))
    ) or 0

    if user:
        log_analytics_request(db, user.id, "documents", filters)

    return {
        "total": total,
        "total_versions": total_versions,
        "by_uploader": by_uploader,
        "recent_uploads": recent,
    }
