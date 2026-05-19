import csv
import json
import io
from typing import Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from app.models.audit_log import AuditLog
from app.models.user import User
from app.core.log import get_logger
from app.utils.pagination import paginate_query

logger = get_logger("audit_log_service")


def _serialize(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, default=str)
    except (TypeError, ValueError):
        return str(value)


def _deserialize(value: Optional[str]) -> Any:
    if value is None:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


def _enrich_log(log: AuditLog) -> dict:
    u = log.user
    return {
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
        "old_value": _deserialize(log.old_value),
        "new_value": _deserialize(log.new_value),
        "metadata": _deserialize(log.metadata_json),
        "ip_address": log.ip_address,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
    }


def _export_row(log: AuditLog) -> dict:
    u = log.user
    return {
        "id": log.id,
        "user_id": log.user_id,
        "user_name": u.name if u else None,
        "user_email": u.email if u else None,
        "action": log.action,
        "entity": log.entity,
        "entity_id": log.entity_id,
        "old_value": log.old_value,
        "new_value": log.new_value,
        "ip_address": log.ip_address,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
    }


def _apply_filters(
    query,
    user_id: Optional[int] = None,
    entity: Optional[str] = None,
    entity_id: Optional[int] = None,
    action: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
):
    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if entity_id is not None:
        query = query.filter(AuditLog.entity_id == entity_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if date_from:
        query = query.filter(AuditLog.timestamp >= date_from)
    if date_to:
        query = query.filter(AuditLog.timestamp <= date_to)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(pattern),
                AuditLog.entity.ilike(pattern),
                AuditLog.old_value.ilike(pattern),
                AuditLog.new_value.ilike(pattern),
                AuditLog.metadata_json.ilike(pattern),
            )
        )
    return query


def log_action(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity: str,
    entity_id: Optional[int] = None,
    old_value: Any = None,
    new_value: Any = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        old_value=_serialize(old_value),
        new_value=_serialize(new_value),
        metadata_json=_serialize(metadata) if metadata else None,
        ip_address=ip_address,
    )
    db.add(log)
    db.commit()

    logger.debug(
        "Audit: user=%s action=%s %s[%s] %s->%s ip=%s",
        user_id, action, entity, entity_id,
        log.old_value, log.new_value, ip_address,
    )
    return log


def get_audit_logs(
    db: Session,
    current_user,
    user_id: Optional[int] = None,
    entity: Optional[str] = None,
    entity_id: Optional[int] = None,
    action: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    page: int = 1,
    size: int = 50,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
):
    query = db.query(AuditLog).options(joinedload(AuditLog.user))
    query = _apply_filters(
        query, user_id, entity, entity_id, action, date_from, date_to, search,
    )

    if not sort_by:
        query = query.order_by(AuditLog.timestamp.desc())

    result = paginate_query(
        db, query,
        page=page, size=size,
        sort_by=sort_by, sort_order=sort_order,
    )

    result["items"] = [_enrich_log(log) for log in result["items"]]
    return result


def get_audit_log_detail(db: Session, log_id: int) -> Optional[dict]:
    log = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.user))
        .filter(AuditLog.id == log_id)
        .first()
    )
    if not log:
        return None
    result = _enrich_log(log)
    result["is_immutable"] = True
    return result


def get_audit_logs_by_entity(
    db: Session,
    entity: str,
    entity_id: int,
    page: int = 1,
    size: int = 50,
):
    query = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.user))
        .filter(AuditLog.entity == entity, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.timestamp.desc())
    )
    result = paginate_query(db, query, page=page, size=size)
    result["items"] = [_enrich_log(log) for log in result["items"]]
    return result


def get_audit_logs_by_user(
    db: Session,
    user_id: int,
    page: int = 1,
    size: int = 50,
):
    query = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.user))
        .filter(AuditLog.user_id == user_id)
        .order_by(AuditLog.timestamp.desc())
    )
    result = paginate_query(db, query, page=page, size=size)
    result["items"] = [_enrich_log(log) for log in result["items"]]
    return result


def export_audit_logs(
    db: Session,
    current_user,
    fmt: str = "csv",
    user_id: Optional[int] = None,
    entity: Optional[str] = None,
    entity_id: Optional[int] = None,
    action: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    limit: int = 10000,
) -> dict:
    query = db.query(AuditLog).options(joinedload(AuditLog.user))
    query = _apply_filters(
        query, user_id, entity, entity_id, action, date_from, date_to, search,
    )
    query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
    logs = query.all()

    rows = [_export_row(log) for log in logs]

    if fmt == "json":
        content = json.dumps(rows, indent=2, default=str)
        media_type = "application/json"
        filename = f"audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "id", "user_id", "user_name", "user_email",
            "action", "entity", "entity_id",
            "old_value", "new_value", "ip_address", "timestamp",
        ])
        writer.writeheader()
        writer.writerows(rows)
        content = output.getvalue()
        media_type = "text/csv"
        filename = f"audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return {
        "content": content,
        "media_type": media_type,
        "filename": filename,
        "total_records": len(rows),
    }


def get_audit_stats(db: Session, current_user):
    total = db.query(func.count(AuditLog.id)).scalar() or 0
    unique_users = (
        db.query(func.count(func.distinct(AuditLog.user_id)))
        .scalar() or 0
    )
    unique_actions = (
        db.query(func.count(func.distinct(AuditLog.action)))
        .scalar() or 0
    )

    action_rows = (
        db.query(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
        .order_by(func.count(AuditLog.id).desc())
        .limit(20)
        .all()
    )
    actions_by_type = [{"action": a, "count": c} for a, c in action_rows]

    entity_rows = (
        db.query(AuditLog.entity, func.count(AuditLog.id))
        .group_by(AuditLog.entity)
        .order_by(func.count(AuditLog.id).desc())
        .all()
    )
    entities_by_type = [{"entity": e, "count": c} for e, c in entity_rows]

    recent = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.user))
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
        .all()
    )

    return {
        "total_logs": total,
        "unique_users": unique_users,
        "unique_actions": unique_actions,
        "actions_by_type": actions_by_type,
        "entities_by_type": entities_by_type,
        "recent_actions": [_enrich_log(log) for log in recent],
    }
