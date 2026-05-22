from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.task import Task


def list_all_tasks(db: Session):
    stmt = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator)
        )
    )
    return paginate(db, stmt)
