from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.task_document import TaskDocument


def list_documents_by_task(db: Session, task_id: int):
    stmt = (
        select(TaskDocument)
        .where(TaskDocument.task_id == task_id)
        .options(selectinload(TaskDocument.uploader))
        .order_by(TaskDocument.created_at.desc())
    )
    return paginate(db, stmt)
