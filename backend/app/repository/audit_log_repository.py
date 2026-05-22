from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.audit_log import AuditLog


def list_all_audit_logs(db: Session):
    stmt = select(AuditLog).options(selectinload(AuditLog.user)).order_by(AuditLog.timestamp.desc())
    return paginate(db, stmt)


def list_audit_logs_by_entity(db: Session, entity: str, entity_id: int):
    stmt = (
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .where(AuditLog.entity == entity, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.timestamp.desc())
    )
    return paginate(db, stmt)


def list_audit_logs_by_user(db: Session, user_id: int):
    stmt = (
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .where(AuditLog.user_id == user_id)
        .order_by(AuditLog.timestamp.desc())
    )
    return paginate(db, stmt)
