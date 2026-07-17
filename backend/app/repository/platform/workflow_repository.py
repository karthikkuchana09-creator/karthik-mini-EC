from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.platform.workflow_definition import WorkflowDefinition
from app.models.platform.workflow_rule import WorkflowRule
from app.models.platform.workflow_execution import WorkflowExecution
from app.core.tenant import tenant_filter


def list_workflows(db: Session, tenant_id: int | None = None, entity_type: str | None = None, include_deleted: bool = False):
    stmt = select(WorkflowDefinition)
    if tenant_id:
        stmt = tenant_filter(stmt, WorkflowDefinition, tenant_id)
    if not include_deleted:
        stmt = stmt.where(WorkflowDefinition.is_deleted == False)
    if entity_type:
        stmt = stmt.where(WorkflowDefinition.entity_type == entity_type.upper())
    stmt = stmt.order_by(WorkflowDefinition.updated_at.desc())
    return paginate(db, stmt)


def get_workflow(db: Session, workflow_id: int, tenant_id: int | None = None):
    stmt = select(WorkflowDefinition).where(WorkflowDefinition.id == workflow_id)
    if tenant_id:
        stmt = tenant_filter(stmt, WorkflowDefinition, tenant_id)
    return db.scalar(stmt)


def list_rules(db: Session, workflow_id: int):
    stmt = select(WorkflowRule).where(WorkflowRule.workflow_id == workflow_id).order_by(WorkflowRule.priority)
    return db.execute(stmt).scalars().all()


def get_rule(db: Session, rule_id: int):
    return db.get(WorkflowRule, rule_id)


def list_executions(db: Session, tenant_id: int | None = None, workflow_id: int | None = None, status: str | None = None):
    stmt = select(WorkflowExecution)
    if tenant_id:
        stmt = tenant_filter(stmt, WorkflowExecution, tenant_id)
    if workflow_id:
        stmt = stmt.where(WorkflowExecution.workflow_id == workflow_id)
    if status:
        stmt = stmt.where(WorkflowExecution.status == status)
    stmt = stmt.order_by(WorkflowExecution.started_at.desc())
    return paginate(db, stmt)
