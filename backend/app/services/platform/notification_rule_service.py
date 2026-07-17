from typing import Optional
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.platform.notification_rule import NotificationRule
from app.core.tenant import tenant_filter
from app.services.enterprise_audit_service import (
    log_notification_rule_create, log_notification_rule_update, log_notification_rule_delete,
)
from app.schemas.platform.notification_rule import EVENT_TYPES, CHANNELS
from app.core.cache import cached, invalidate
from app.core.config import settings


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@invalidate(patterns=["nr:*"])
def create_rule(db: Session, data, user, tenant_id: int | None = None):
    if data.event_type not in EVENT_TYPES:
        raise HTTPException(400, f"Invalid event_type '{data.event_type}'. Must be one of: {', '.join(sorted(EVENT_TYPES))}")
    if data.channel not in CHANNELS:
        raise HTTPException(400, f"Invalid channel '{data.channel}'. Must be one of: {', '.join(sorted(CHANNELS))}")

    rule = NotificationRule(
        name=data.name,
        description=data.description,
        event_type=data.event_type,
        channel=data.channel,
        condition_config=data.condition_config,
        template_config=data.template_config,
        recipient_config=data.recipient_config,
        is_active=data.is_active,
        created_by=user.id,
        tenant_id=tenant_id,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    log_notification_rule_create(db, user.id, rule.id, {"name": rule.name, "event_type": rule.event_type, "channel": rule.channel})
    return rule


@cached(prefix="nr:get", ttl=lambda: settings.CACHE_TTL_NOTIFICATION_RULE, exclude_args=[0])
def get_rule(db: Session, rule_id: int, tenant_id: int | None = None):
    rule = db.scalar(
        tenant_filter(select(NotificationRule), NotificationRule, tenant_id)
        .where(NotificationRule.id == rule_id, NotificationRule.is_deleted == False)
    )
    if not rule:
        raise HTTPException(404, "Notification rule not found")
    return rule


@cached(prefix="nr:list", ttl=lambda: settings.CACHE_TTL_NOTIFICATION_RULE, exclude_args=[0])
def list_rules(db: Session, tenant_id: int | None = None, event_type: str | None = None, page: int = 1, size: int = 20):
    query = tenant_filter(select(NotificationRule), NotificationRule, tenant_id).where(NotificationRule.is_deleted == False)
    if event_type:
        query = query.where(NotificationRule.event_type == event_type)
    query = query.order_by(NotificationRule.updated_at.desc())
    from fastapi_pagination.ext.sqlalchemy import paginate
    return paginate(db, query)


@invalidate(patterns=["nr:*"])
def update_rule(db: Session, rule_id: int, data, user, tenant_id: int | None = None):
    rule = db.scalar(
        tenant_filter(select(NotificationRule), NotificationRule, tenant_id)
        .where(NotificationRule.id == rule_id, NotificationRule.is_deleted == False)
    )
    if not rule:
        raise HTTPException(404, "Notification rule not found")

    update_data = data.model_dump(exclude_unset=True)
    if "event_type" in update_data and update_data["event_type"] not in EVENT_TYPES:
        raise HTTPException(400, f"Invalid event_type. Must be one of: {', '.join(sorted(EVENT_TYPES))}")
    if "channel" in update_data and update_data["channel"] not in CHANNELS:
        raise HTTPException(400, f"Invalid channel. Must be one of: {', '.join(sorted(CHANNELS))}")

    for key, val in update_data.items():
        if val is not None:
            setattr(rule, key, val)
    db.commit()
    db.refresh(rule)

    log_notification_rule_update(db, user.id, rule_id, None, {"name": rule.name})
    return rule


@invalidate(patterns=["nr:*"])
def delete_rule(db: Session, rule_id: int, user, tenant_id: int | None = None):
    rule = db.scalar(
        tenant_filter(select(NotificationRule), NotificationRule, tenant_id)
        .where(NotificationRule.id == rule_id, NotificationRule.is_deleted == False)
    )
    if not rule:
        raise HTTPException(404, "Notification rule not found")
    rule.is_deleted = True
    db.commit()
    log_notification_rule_delete(db, user.id, rule_id, {"name": rule.name})
    return {"message": "Notification rule soft-deleted"}


# ---------------------------------------------------------------------------
# Rule Evaluation & Dispatch
# ---------------------------------------------------------------------------

def evaluate_and_dispatch(
    db: Session,
    event_type: str,
    entity_data: Optional[dict] = None,
    tenant_id: int | None = None,
    triggered_by: int | None = None,
):
    from app.repository.platform.notification_rule_repository import get_active_rules_by_event
    rules = get_active_rules_by_event(db, event_type, tenant_id)

    dispatched = []
    for rule in rules:
        if rule.condition_config and entity_data:
            if not _evaluate_conditions(rule.condition_config, entity_data):
                continue

        recipients = _resolve_recipients(db, rule, entity_data, tenant_id)
        if not recipients:
            continue

        for user_id in recipients:
            message = _render_template(rule.template_config or {}, entity_data)
            if rule.channel in ("in_app", "both"):
                from app.services.notification_service import create_notification
                create_notification(
                    db, user_id=user_id, message=message,
                    type=event_type, notification_type=event_type,
                    priority=entity_data.get("priority", "medium") if entity_data else "medium",
                    tenant_id=tenant_id,
                )
            if rule.channel in ("email", "both"):
                _send_email(user_id, message, rule.template_config or {}, tenant_id)

            dispatched.append({"rule_id": rule.id, "user_id": user_id, "channel": rule.channel})

    return dispatched


def _evaluate_conditions(conditions: dict, entity_data: dict) -> bool:
    for key, expected in conditions.items():
        actual = entity_data.get(key)
        if isinstance(expected, list):
            if actual not in expected and actual is not None:
                return False
        elif isinstance(expected, dict):
            op = expected.get("operator", "eq")
            val = expected.get("value")
            if op == "eq" and actual != val:
                return False
            elif op == "ne" and actual == val:
                return False
            elif op == "in" and (actual is None or actual not in val):
                return False
        else:
            if actual != expected:
                return False
    return True


def _resolve_recipients(db: Session, rule, entity_data: Optional[dict], tenant_id: int | None = None) -> list[int]:
    from app.models.user import User
    config = rule.recipient_config or {}
    user_ids = set()

    if "user_ids" in config:
        user_ids.update(config["user_ids"])
    if "roles" in config:
        stmt = select(User.id).where(
            User.role.in_(config["roles"]),
            User.is_active == True,
        )
        if tenant_id:
            stmt = stmt.where(User.tenant_id == tenant_id)
        for row in db.execute(stmt):
            user_ids.add(row[0])
    if config.get("include_creator") and entity_data and "created_by" in entity_data:
        user_ids.add(entity_data["created_by"])
    if config.get("include_assignee") and entity_data and "assigned_to" in entity_data:
        user_ids.add(entity_data["assigned_to"])

    return list(user_ids)


def _render_template(template: dict, entity_data: Optional[dict]) -> str:
    body = template.get("body", "Notification: {{event_type}}")
    if entity_data:
        import re
        def replacer(m):
            key = m.group(1)
            parts = key.split(".")
            val = entity_data
            for p in parts:
                if isinstance(val, dict):
                    val = val.get(p, m.group(0))
                else:
                    return m.group(0)
            return str(val) if val is not None else m.group(0)
        body = re.sub(r"\{\{(\w+(?:\.\w+)*)\}\}", replacer, body)
    return body


def _send_email(user_id: int, message: str, template: dict, tenant_id: int | None = None):
    subject = template.get("subject", "Notification")
    try:
        from app.services.email_service import send_email
        from app.db.session import SessionLocal
        email_db = SessionLocal()
        try:
            from app.models.user import User
            user = email_db.scalar(
                select(User).where(User.id == user_id)
            )
            if user and user.email:
                send_email(user.email, subject, message)
        finally:
            email_db.close()
    except ImportError:
        pass
    except Exception:
        pass
