from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.platform.notification_rule import NotificationRule
from app.core.tenant import tenant_filter


def list_rules(db: Session, tenant_id: int | None = None, event_type: str | None = None, include_deleted: bool = False):
    stmt = select(NotificationRule)
    if tenant_id:
        stmt = tenant_filter(stmt, NotificationRule, tenant_id)
    if not include_deleted:
        stmt = stmt.where(NotificationRule.is_deleted == False)
    if event_type:
        stmt = stmt.where(NotificationRule.event_type == event_type)
    stmt = stmt.order_by(NotificationRule.updated_at.desc())
    return paginate(db, stmt)


def get_rule(db: Session, rule_id: int, tenant_id: int | None = None):
    stmt = select(NotificationRule).where(NotificationRule.id == rule_id, NotificationRule.is_deleted == False)
    if tenant_id:
        stmt = tenant_filter(stmt, NotificationRule, tenant_id)
    return db.scalar(stmt)


def get_active_rules_by_event(db: Session, event_type: str, tenant_id: int | None = None):
    stmt = select(NotificationRule).where(
        NotificationRule.event_type == event_type,
        NotificationRule.is_active == True,
        NotificationRule.is_deleted == False,
    )
    if tenant_id:
        stmt = tenant_filter(stmt, NotificationRule, tenant_id)
    stmt = stmt.order_by(NotificationRule.updated_at.desc())
    return db.execute(stmt).scalars().all()
