from typing import Optional
from sqlalchemy.orm import Session, joinedload
from app.models.audit_log import AuditLog
from app.models.user import User
from app.core.log import get_logger
from app.utils.pagination import paginate_query

logger = get_logger("audit_log_service")


def log_action(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity: str,
    entity_id: Optional[int] = None,
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
    )
    db.add(log)
    db.commit()

    logger.debug("Audit log created: action=%s entity=%s id=%s", action, entity, entity_id)
    return log


def get_audit_logs(
    db: Session,
    current_user,
    user_id: Optional[int] = None,
    entity: Optional[str] = None,
    entity_id: Optional[int] = None,
    page: int = 1,
    size: int = 50,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
):
    query = db.query(AuditLog).options(joinedload(AuditLog.user))

    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if entity_id is not None:
        query = query.filter(AuditLog.entity_id == entity_id)

    if not sort_by:
        query = query.order_by(AuditLog.timestamp.desc())

    result = paginate_query(
        db, query,
        page=page, size=size,
        sort_by=sort_by, sort_order=sort_order,
    )

    enriched = []
    for log in result["items"]:
        u = log.user
        enriched.append({
            "id": log.id,
            "user_id": log.user_id,
            "user": {
                "id": u.id,
                "name": u.name,
                "email": u.email,
            } if u else None,
            "action": log.action,
            "entity": log.entity,
            "entity_id": log.entity_id,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        })

    result["items"] = enriched
    return result


def get_audit_logs_by_entity(db: Session, entity: str, entity_id: int):
    logger.debug("Fetching audit logs for %s id=%d", entity, entity_id)
    return (
        db.query(AuditLog)
        .filter(AuditLog.entity == entity, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.timestamp.desc())
        .all()
    )
