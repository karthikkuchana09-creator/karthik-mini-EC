from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.task import Task


def list_tasks_by_channel(db: Session, channel_id: int):
    stmt = (
        select(Task)
        .where(Task.channel_id == channel_id)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator),
        )
        .order_by(Task.created_at.desc())
    )
    return paginate(db, stmt)
