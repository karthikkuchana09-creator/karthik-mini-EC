from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.platform.report import Report


def list_reports(db: Session, tenant_id: int | None = None):
    stmt = select(Report)
    if tenant_id:
        stmt = stmt.where(Report.tenant_id == tenant_id)
    return paginate(db, stmt)


def get_report(db: Session, report_id: int):
    return db.get(Report, report_id)
