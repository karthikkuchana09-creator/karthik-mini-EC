from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.user import User


def list_all_users(db: Session, tenant_id: int = None):
    stmt = select(User)
    if tenant_id:
        stmt = stmt.where(User.tenant_id == tenant_id)
    return paginate(db, stmt)
