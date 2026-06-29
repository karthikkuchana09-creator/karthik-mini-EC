from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.task import Task
from app.core.tenant import tenant_filter


def list_tasks_by_project(db: Session, project_id: int, tenant_id: int | None = None):
    stmt = tenant_filter(
        select(Task), Task, tenant_id
    ).where(
        Task.project_id == project_id,
    ).options(
        selectinload(Task.assignee),
        selectinload(Task.creator),
    ).order_by(Task.created_at.desc())
    return paginate(db, stmt)
