from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.tenant import Tenant


def list_all_tenants(db: Session):
    stmt = select(Tenant)
    return paginate(db, stmt)
