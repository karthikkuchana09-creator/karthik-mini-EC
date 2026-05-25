import csv
import json
import io
from math import ceil
from typing import Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, or_, desc, asc
from app.models.audit_log import AuditLog
from app.models.user import User
from app.core.log import get_logger

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
    stmt,
    user_id: Optional[int] = None,
    entity: Optional[str] = None,
    entity_id: Optional[int] = None,
    action: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
):
    if user_id is not None:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if entity:
        stmt = stmt.where(AuditLog.entity == entity)
    if entity_id is not None:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if date_from:
        stmt = stmt.where(AuditLog.timestamp >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.timestamp <= date_to)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                AuditLog.action.ilike(pattern),
                AuditLog.entity.ilike(pattern),
                AuditLog.old_value.ilike(pattern),
                AuditLog.new_value.ilike(pattern),
                AuditLog.metadata_json.ilike(pattern),
            )
        )
    return stmt


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
    stmt = select(AuditLog).options(joinedload(AuditLog.user))
    stmt = _apply_filters(
        stmt, user_id, entity, entity_id, action, date_from, date_to, search,
    )

    if not sort_by:
        stmt = stmt.order_by(AuditLog.timestamp.desc())

    count_stmt = select(func.count()).select_from(AuditLog)
    count_stmt = _apply_filters(
        count_stmt, user_id, entity, entity_id, action, date_from, date_to, search,
    )
    total = db.scalar(count_stmt) or 0

    if sort_by:
        try:
            column = getattr(AuditLog, sort_by)
            order_fn = desc if sort_order == "desc" else asc
            stmt = stmt.order_by(order_fn(column))
        except AttributeError:
            pass

    pages = max(ceil(total / size), 0) if total else 0
    items = db.execute(stmt.offset((page - 1) * size).limit(size)).scalars().all()

    result = {"items": items, "total": total, "page": page, "size": size, "pages": pages}
    result["items"] = [_enrich_log(log) for log in result["items"]]
    return result


def get_audit_log_detail(db: Session, log_id: int) -> Optional[dict]:
    log = db.scalar(
        select(AuditLog)
        .options(joinedload(AuditLog.user))
        .where(AuditLog.id == log_id)
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
    stmt = (
        select(AuditLog)
        .options(joinedload(AuditLog.user))
        .where(AuditLog.entity == entity, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.timestamp.desc())
    )
    total = db.scalar(
        select(func.count()).select_from(AuditLog)
        .where(AuditLog.entity == entity, AuditLog.entity_id == entity_id)
    ) or 0
    pages = max(ceil(total / size), 0) if total else 0
    items = db.execute(stmt.offset((page - 1) * size).limit(size)).scalars().all()
    result = {"items": items, "total": total, "page": page, "size": size, "pages": pages}
    result["items"] = [_enrich_log(log) for log in result["items"]]
    return result


def get_audit_logs_by_user(
    db: Session,
    user_id: int,
    page: int = 1,
    size: int = 50,
):
    stmt = (
        select(AuditLog)
        .options(joinedload(AuditLog.user))
        .where(AuditLog.user_id == user_id)
        .order_by(AuditLog.timestamp.desc())
    )
    total = db.scalar(
        select(func.count()).select_from(AuditLog)
        .where(AuditLog.user_id == user_id)
    ) or 0
    pages = max(ceil(total / size), 0) if total else 0
    items = db.execute(stmt.offset((page - 1) * size).limit(size)).scalars().all()
    result = {"items": items, "total": total, "page": page, "size": size, "pages": pages}
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
    stmt = select(AuditLog).options(joinedload(AuditLog.user))
    stmt = _apply_filters(
        stmt, user_id, entity, entity_id, action, date_from, date_to, search,
    )
    stmt = stmt.order_by(AuditLog.timestamp.desc()).limit(limit)
    logs = db.execute(stmt).scalars().all()

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
    total = db.scalar(select(func.count(AuditLog.id))) or 0
    unique_users = (
        db.scalar(select(func.count(func.distinct(AuditLog.user_id)))) or 0
    )
    unique_actions = (
        db.scalar(select(func.count(func.distinct(AuditLog.action)))) or 0
    )

    action_rows = db.execute(
        select(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
        .order_by(func.count(AuditLog.id).desc())
        .limit(20)
    ).all()
    actions_by_type = [{"action": a, "count": c} for a, c in action_rows]

    entity_rows = db.execute(
        select(AuditLog.entity, func.count(AuditLog.id))
        .group_by(AuditLog.entity)
        .order_by(func.count(AuditLog.id).desc())
    ).all()
    entities_by_type = [{"entity": e, "count": c} for e, c in entity_rows]

    recent = db.execute(
        select(AuditLog)
        .options(joinedload(AuditLog.user))
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
    ).scalars().all()

    return {
        "total_logs": total,
        "unique_users": unique_users,
        "unique_actions": unique_actions,
        "actions_by_type": actions_by_type,
        "entities_by_type": entities_by_type,
        "recent_actions": [_enrich_log(log) for log in recent],
    }
