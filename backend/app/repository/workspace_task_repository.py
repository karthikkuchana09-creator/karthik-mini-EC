from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.task import Task


def list_tasks_by_workspace(db: Session, workspace_id: int):
    stmt = (
        select(Task)
        .where(
            Task.workspace_id == workspace_id,
            Task.channel_id.is_(None),
        )
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator),
        )
        .order_by(Task.created_at.desc())
    )
    return paginate(db, stmt)
