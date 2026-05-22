from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.comment import Comment


def list_comments_by_task(db: Session, task_id: int):
    stmt = select(Comment).where(Comment.task_id == task_id)
    return paginate(db, stmt)
