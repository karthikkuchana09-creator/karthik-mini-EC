from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.sla_rule import SLARule
from app.schemas.sla_rule import SLARuleCreate, SLARuleUpdate, SLARuleFilter
from app.core.pagination import QueryBuilder
from app.core.log import get_logger

logger = get_logger("sla_rule_service")


def list_sla_rules_filtered(db: Session, filters: SLARuleFilter):
    query = select(SLARule).options(selectinload(SLARule.creator))
    return (
        QueryBuilder(db, SLARule, query)
        .search(filters.q, [SLARule.module_name, SLARule.priority])
        .filter_exact(
            module_name=filters.module_name,
            priority=filters.priority,
            is_active=filters.is_active,
            created_by=filters.created_by,
        )
        .sort(filters.sort_by, filters.sort_order, [
            "module_name", "priority", "allowed_hours",
            "is_active", "created_at", "updated_at",
        ])
        .paginate(filters.page, filters.size)
    )


def create_sla_rule(db: Session, rule_data: SLARuleCreate, current_user):
    logger.info(
        "Creating SLA rule: module=%s priority=%s by user_id=%d",
        rule_data.module_name, rule_data.priority, current_user.id,
    )

    new_rule = SLARule(
        module_name=rule_data.module_name,
        priority=rule_data.priority,
        allowed_hours=rule_data.allowed_hours,
        escalation_enabled=rule_data.escalation_enabled,
        escalation_after_hours=rule_data.escalation_after_hours,
        is_active=True,
        created_by=current_user.id,
    )

    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    logger.info("SLA rule created successfully id=%d", new_rule.id)
    return new_rule


def get_sla_rule_by_id(db: Session, rule_id: int):
    logger.debug("Fetching SLA rule id=%d", rule_id)
    rule = db.scalar(select(SLARule).where(SLARule.id == rule_id))

    if not rule:
        logger.warning("SLA rule not found id=%d", rule_id)
        raise HTTPException(404, "SLA rule not found")

    return rule


def update_sla_rule(db: Session, rule_id: int, rule_data: SLARuleUpdate, current_user):
    logger.info("Updating SLA rule id=%d by user_id=%d", rule_id, current_user.id)
    rule = db.scalar(select(SLARule).where(SLARule.id == rule_id))

    if not rule:
        logger.warning("SLA rule update failed: not found id=%d", rule_id)
        raise HTTPException(404, "SLA rule not found")

    update_data = rule_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rule, key, value)

    db.commit()
    db.refresh(rule)

    logger.info("SLA rule id=%d updated successfully", rule_id)
    return rule


def delete_sla_rule(db: Session, rule_id: int, current_user):
    logger.info("Soft-deleting SLA rule id=%d by user_id=%d", rule_id, current_user.id)
    rule = db.scalar(select(SLARule).where(SLARule.id == rule_id))

    if not rule:
        logger.warning("SLA rule delete failed: not found id=%d", rule_id)
        raise HTTPException(404, "SLA rule not found")

    rule.is_active = False
    db.commit()
    db.refresh(rule)

    logger.info("SLA rule id=%d soft-deleted successfully", rule_id)
    return {"message": "SLA rule disabled successfully"}
