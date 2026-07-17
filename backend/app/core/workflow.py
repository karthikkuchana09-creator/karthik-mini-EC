from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.tenant import tenant_filter
from app.core.log import get_logger

logger = get_logger("workflow")


def get_workflow_for_entity(db: Session, entity_type: str, tenant_id: int | None = None):
    from app.models.platform.workflow_definition import WorkflowDefinition
    from app.models.platform.workflow_stage import WorkflowStage
    from app.models.platform.workflow_transition import WorkflowTransition

    stmt = select(WorkflowDefinition).options(
        __import__('sqlalchemy.orm', fromlist=['joinedload']).joinedload(WorkflowDefinition.stages),
        __import__('sqlalchemy.orm', fromlist=['joinedload']).joinedload(WorkflowDefinition.transitions),
    ).where(
        WorkflowDefinition.entity_type == entity_type,
        WorkflowDefinition.status == "active",
    )
    if tenant_id is not None:
        stmt = tenant_filter(stmt, WorkflowDefinition, tenant_id)
    stmt = stmt.order_by(WorkflowDefinition.created_at.desc()).limit(1)

    return db.execute(stmt).scalar_one_or_none()


def validate_transition(current: str, new: str, db: Session = None, workflow_id: int | None = None) -> bool:
    if db is None or workflow_id is None:
        fallback = {
            "todo": ["in_progress"],
            "in_progress": ["review"],
            "review": ["done"],
            "done": [],
        }
        return new in fallback.get(current, [])

    from app.models.platform.workflow_stage import WorkflowStage
    from app.models.platform.workflow_transition import WorkflowTransition

    current_stage = db.scalar(
        select(WorkflowStage).where(
            WorkflowStage.workflow_id == workflow_id,
            WorkflowStage.name == current,
        )
    )
    new_stage = db.scalar(
        select(WorkflowStage).where(
            WorkflowStage.workflow_id == workflow_id,
            WorkflowStage.name == new,
        )
    )
    if not current_stage or not new_stage:
        return False

    transition = db.scalar(
        select(WorkflowTransition).where(
            WorkflowTransition.workflow_id == workflow_id,
            WorkflowTransition.from_stage_id == current_stage.id,
            WorkflowTransition.to_stage_id == new_stage.id,
        )
    )
    return transition is not None
