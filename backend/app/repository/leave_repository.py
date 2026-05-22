from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.leave import Leave


def list_all_leaves(db: Session, user_id: int = None, tenant_id: int = None):
    stmt = select(Leave)
    if user_id:
        stmt = stmt.where(Leave.user_id == user_id)
    if tenant_id:
        stmt = stmt.where(Leave.tenant_id == tenant_id)
    return paginate(db, stmt)
