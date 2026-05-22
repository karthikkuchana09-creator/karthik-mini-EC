from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.organization import Organization


def list_all_organizations(db: Session, tenant_id: int = None):
    stmt = select(Organization)
    if tenant_id:
        stmt = stmt.where(Organization.id == tenant_id)
    return paginate(db, stmt)
