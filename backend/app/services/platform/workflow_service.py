from typing import Optional
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.platform.workflow_definition import WorkflowDefinition
from app.models.platform.workflow_rule import WorkflowRule
from app.models.platform.workflow_execution import WorkflowExecution
from app.core.tenant import tenant_filter
from app.services.enterprise_audit_service import (
    log_workflow_create, log_workflow_update, log_workflow_delete,
    log_workflow_rule_create, log_workflow_rule_update, log_workflow_rule_delete,
    log_workflow_execution,
)
from datetime import datetime, timezone

VALID_ENTITY_TYPES = {"TASK", "APPROVAL", "PROJECT", "MEETING"}
VALID_TRIGGER_EVENTS = {"on_create", "on_update", "on_status_change", "on_overdue", "on_approval_pending", "manual"}


# ---------------------------------------------------------------------------
# Workflow CRUD
# ---------------------------------------------------------------------------

def create_workflow(db: Session, data, user, tenant_id: int | None = None):
    entity_type = data.entity_type.upper()
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(400, f"Invalid entity_type '{data.entity_type}'. Must be one of: {', '.join(sorted(VALID_ENTITY_TYPES))}")
    if data.trigger_event and data.trigger_event not in VALID_TRIGGER_EVENTS:
        raise HTTPException(400, f"Invalid trigger_event '{data.trigger_event}'. Must be one of: {', '.join(sorted(VALID_TRIGGER_EVENTS))}")

    wf = WorkflowDefinition(
        name=data.name,
        description=data.description,
        entity_type=entity_type,
        trigger_event=data.trigger_event,
        status=data.status,
        config=data.config,
        created_by=user.id,
        tenant_id=tenant_id,
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)

    log_workflow_create(db, user.id, wf.id, {"name": wf.name, "entity_type": wf.entity_type, "trigger_event": wf.trigger_event})
    return wf


def get_workflow(db: Session, workflow_id: int, tenant_id: int | None = None):
    wf = db.scalar(
        tenant_filter(select(WorkflowDefinition), WorkflowDefinition, tenant_id)
        .where(WorkflowDefinition.id == workflow_id, WorkflowDefinition.is_deleted == False)
        .options(selectinload(WorkflowDefinition.rules))
    )
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return wf


def list_workflows(db: Session, tenant_id: int | None = None, entity_type: str | None = None, page: int = 1, size: int = 20):
    query = tenant_filter(select(WorkflowDefinition), WorkflowDefinition, tenant_id).where(WorkflowDefinition.is_deleted == False)
    if entity_type:
        query = query.where(WorkflowDefinition.entity_type == entity_type.upper())
    query = query.order_by(WorkflowDefinition.updated_at.desc())
    from fastapi_pagination.ext.sqlalchemy import paginate
    return paginate(db, query)


def update_workflow(db: Session, workflow_id: int, data, user, tenant_id: int | None = None):
    wf = db.scalar(
        tenant_filter(select(WorkflowDefinition), WorkflowDefinition, tenant_id)
        .where(WorkflowDefinition.id == workflow_id, WorkflowDefinition.is_deleted == False)
    )
    if not wf:
        raise HTTPException(404, "Workflow not found")

    update_data = data.model_dump(exclude_unset=True)
    if "entity_type" in update_data:
        entity_type = update_data["entity_type"].upper()
        if entity_type not in VALID_ENTITY_TYPES:
            raise HTTPException(400, f"Invalid entity_type. Must be one of: {', '.join(sorted(VALID_ENTITY_TYPES))}")
        update_data["entity_type"] = entity_type
    if "trigger_event" in update_data and update_data["trigger_event"] and update_data["trigger_event"] not in VALID_TRIGGER_EVENTS:
        raise HTTPException(400, f"Invalid trigger_event. Must be one of: {', '.join(sorted(VALID_TRIGGER_EVENTS))}")

    for key, val in update_data.items():
        if val is not None:
            setattr(wf, key, val)
    db.commit()
    db.refresh(wf)

    log_workflow_update(db, user.id, workflow_id, None, {"name": wf.name, "status": wf.status})
    return wf


def delete_workflow(db: Session, workflow_id: int, user, tenant_id: int | None = None):
    wf = db.scalar(
        tenant_filter(select(WorkflowDefinition), WorkflowDefinition, tenant_id)
        .where(WorkflowDefinition.id == workflow_id, WorkflowDefinition.is_deleted == False)
    )
    if not wf:
        raise HTTPException(404, "Workflow not found")
    wf.is_deleted = True
    wf.status = "deleted"
    db.commit()
    log_workflow_delete(db, user.id, workflow_id, {"name": wf.name, "status": wf.status})
    return {"message": "Workflow soft-deleted"}


# ---------------------------------------------------------------------------
# Rule CRUD
# ---------------------------------------------------------------------------

def create_rule(db: Session, workflow_id: int, data, user, tenant_id: int | None = None):
    wf = db.scalar(
        tenant_filter(select(WorkflowDefinition), WorkflowDefinition, tenant_id)
        .where(WorkflowDefinition.id == workflow_id, WorkflowDefinition.is_deleted == False)
    )
    if not wf:
        raise HTTPException(404, "Workflow not found")

    rule = WorkflowRule(
        workflow_id=workflow_id,
        name=data.name,
        description=data.description,
        condition_config=data.condition_config,
        action_config=data.action_config,
        priority=data.priority,
        is_active=data.is_active,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    log_workflow_rule_create(db, user.id, rule.id, {"name": rule.name, "workflow_id": workflow_id, "priority": rule.priority})
    return rule


def update_rule(db: Session, rule_id: int, data, user, tenant_id: int | None = None):
    rule = db.scalar(
        select(WorkflowRule)
        .join(WorkflowDefinition, WorkflowRule.workflow_id == WorkflowDefinition.id)
        .where(WorkflowRule.id == rule_id, WorkflowDefinition.tenant_id == tenant_id)
    )
    if not rule:
        raise HTTPException(404, "Rule not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        if val is not None:
            setattr(rule, key, val)
    db.commit()
    db.refresh(rule)
    log_workflow_rule_update(db, user.id, rule_id, None, {"name": rule.name})
    return rule


def delete_rule(db: Session, rule_id: int, user, tenant_id: int | None = None):
    rule = db.scalar(
        select(WorkflowRule)
        .join(WorkflowDefinition, WorkflowRule.workflow_id == WorkflowDefinition.id)
        .where(WorkflowRule.id == rule_id, WorkflowDefinition.tenant_id == tenant_id)
    )
    if not rule:
        raise HTTPException(404, "Rule not found")

    db.delete(rule)
    db.commit()
    log_workflow_rule_delete(db, user.id, rule_id, {"name": rule.name})
    return {"message": "Rule deleted"}


# ---------------------------------------------------------------------------
# Execution Engine
# ---------------------------------------------------------------------------

def _evaluate_condition(condition: dict, entity_data: dict) -> bool:
    field = condition.get("field")
    operator = condition.get("operator", "eq")
    value = condition.get("value")
    if not field:
        return True
    actual = entity_data.get(field)
    if operator == "eq":
        return actual == value
    elif operator == "ne":
        return actual != value
    elif operator == "gt":
        return actual is not None and value is not None and actual > value
    elif operator == "gte":
        return actual is not None and value is not None and actual >= value
    elif operator == "lt":
        return actual is not None and value is not None and actual < value
    elif operator == "lte":
        return actual is not None and value is not None and actual <= value
    elif operator == "in":
        return actual in (value or [])
    elif operator == "contains":
        return value is not None and actual is not None and value in str(actual)
    elif operator == "is_set":
        return actual is not None
    return False


def execute_workflow(db: Session, workflow_id: int, entity_type: str, entity_id: int, entity_data: dict | None = None, user=None, tenant_id: int | None = None):
    wf = db.scalar(
        tenant_filter(select(WorkflowDefinition), WorkflowDefinition, tenant_id)
        .where(WorkflowDefinition.id == workflow_id, WorkflowDefinition.is_deleted == False, WorkflowDefinition.status == "active")
    )
    if not wf:
        raise HTTPException(404, "Active workflow not found")

    rules = db.execute(
        select(WorkflowRule)
        .where(WorkflowRule.workflow_id == wf.id, WorkflowRule.is_active == True)
        .order_by(WorkflowRule.priority)
    ).scalars().all()

    if not rules:
        raise HTTPException(400, "Workflow has no active rules")

    execution = WorkflowExecution(
        workflow_id=wf.id,
        entity_type=entity_type.upper(),
        entity_id=entity_id,
        trigger_event=wf.trigger_event,
        status="running",
        result_log=[],
        started_by=user.id if user else None,
        started_at=datetime.now(timezone.utc),
        tenant_id=tenant_id,
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    results = []
    all_passed = True
    for rule in rules:
        passed = True
        if entity_data and rule.condition_config:
            passed = _evaluate_condition(rule.condition_config, entity_data)
        result_entry = {
            "rule_id": rule.id,
            "rule_name": rule.name,
            "condition_passed": passed,
            "action": rule.action_config if passed else None,
            "executed_at": datetime.now(timezone.utc).isoformat(),
        }
        results.append(result_entry)
        if not passed:
            all_passed = False

    execution.result_log = results
    execution.status = "completed" if all_passed else "completed_with_warnings"
    execution.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(execution)

    log_workflow_execution(db, user.id if user else 0, execution.id, wf.id, execution.status,
                           {"entity_type": entity_type, "entity_id": entity_id, "total_rules": len(rules)})
    return execution


def list_executions(db: Session, tenant_id: int | None = None, workflow_id: int | None = None, status: str | None = None, page: int = 1, size: int = 20):
    query = tenant_filter(select(WorkflowExecution), WorkflowExecution, tenant_id)
    if workflow_id:
        query = query.where(WorkflowExecution.workflow_id == workflow_id)
    if status:
        query = query.where(WorkflowExecution.status == status)
    query = query.order_by(WorkflowExecution.started_at.desc())
    from fastapi_pagination.ext.sqlalchemy import paginate
    return paginate(db, query)
