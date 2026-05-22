from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.approval import Approval


def list_all_approvals(db: Session):
    stmt = select(Approval).options(selectinload(Approval.requester))
    return paginate(db, stmt)
