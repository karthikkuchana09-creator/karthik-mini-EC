from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.document import Document


def list_all_documents(db: Session, task_id: int = None, tenant_id: int = None):
    stmt = select(Document).options(selectinload(Document.uploader))
    if task_id:
        stmt = stmt.where(Document.task_id == task_id)
    if tenant_id is not None:
        stmt = stmt.where(Document.tenant_id == tenant_id)
    return paginate(db, stmt)
