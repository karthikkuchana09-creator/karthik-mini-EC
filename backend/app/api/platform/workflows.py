from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import Optional
from fastapi_pagination import Page

from app.schemas.platform.workflow import (
    WorkflowCreate, WorkflowUpdate, WorkflowOut,
    WorkflowRuleCreate, WorkflowRuleUpdate, WorkflowRuleOut,
    WorkflowExecutionOut,
)
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.platform.workflow_service import (
    create_workflow, get_workflow, list_workflows, update_workflow, delete_workflow,
    create_rule, update_rule, delete_rule,
    execute_workflow, list_executions,
)

router = APIRouter(prefix="/workflows", tags=["Workflow Automation"])


# ---------------------------------------------------------------------------
# Workflow Definition Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=WorkflowOut,
    summary="Create a new workflow",
    description="Create a reusable workflow definition for automated actions. "
                "Valid entity_type values: TASK, APPROVAL, PROJECT, MEETING. "
                "Valid trigger_event values: on_create, on_update, on_status_change, on_overdue, on_approval_pending, manual.",
    responses={
        201: {"description": "Workflow created successfully"},
        400: {"description": "Invalid entity_type or trigger_event"},
        403: {"description": "Permission denied"},
    },
)
def create_workflow_endpoint(
    data: WorkflowCreate = Body(..., description="Workflow creation payload"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.workflow_create)),
):
    return create_workflow(db, data, user, tenant_id=user.tenant_id)


@router.get(
    "",
    response_model=Page[WorkflowOut],
    summary="List workflows",
    description="Retrieve all workflows for the current tenant. Optionally filter by entity_type.",
)
def list_workflows_endpoint(
    entity_type: Optional[str] = Query(None, description="Filter by entity type: TASK, APPROVAL, PROJECT, MEETING"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.workflow_read)),
):
    return list_workflows(db, tenant_id=user.tenant_id, entity_type=entity_type, page=page, size=size)


@router.get(
    "/{workflow_id}",
    response_model=WorkflowOut,
    summary="Get workflow details",
    description="Retrieve a single workflow by ID, including its rules.",
)
def get_workflow_endpoint(
    workflow_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.workflow_read)),
):
    return get_workflow(db, workflow_id, tenant_id=user.tenant_id)


@router.put(
    "/{workflow_id}",
    response_model=WorkflowOut,
    summary="Update workflow",
    description="Update an existing workflow's name, description, entity_type, trigger_event, status, or config.",
)
def update_workflow_endpoint(
    workflow_id: int,
    data: WorkflowUpdate = Body(..., description="Workflow update payload"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.workflow_update)),
):
    return update_workflow(db, workflow_id, data, user, tenant_id=user.tenant_id)


@router.delete(
    "/{workflow_id}",
    summary="Soft-delete workflow",
    description="Soft-delete a workflow by setting is_deleted=True and status='deleted'. "
                "The workflow remains in the database but is excluded from all queries.",
)
def delete_workflow_endpoint(
    workflow_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.workflow_delete)),
):
    return delete_workflow(db, workflow_id, user, tenant_id=user.tenant_id)


# ---------------------------------------------------------------------------
# Rule Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/{workflow_id}/rules",
    response_model=WorkflowRuleOut,
    summary="Add rule to workflow",
    description="Add a new automation rule to a workflow. "
                "condition_config example: {\"field\": \"status\", \"operator\": \"eq\", \"value\": \"overdue\", \"time_delay_hours\": 48}. "
                "action_config example: {\"type\": \"notify\", \"params\": {\"recipients\": [\"team_lead\", \"project_manager\"], \"message\": \"Task is overdue\"}}.",
)
def create_rule_endpoint(
    workflow_id: int,
    data: WorkflowRuleCreate = Body(..., description="Rule creation payload"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.workflow_update)),
):
    return create_rule(db, workflow_id, data, user, tenant_id=user.tenant_id)


@router.put(
    "/rules/{rule_id}",
    response_model=WorkflowRuleOut,
    summary="Update rule",
    description="Update an existing rule's configuration.",
)
def update_rule_endpoint(
    rule_id: int,
    data: WorkflowRuleUpdate = Body(..., description="Rule update payload"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.workflow_update)),
):
    return update_rule(db, rule_id, data, user, tenant_id=user.tenant_id)


@router.delete(
    "/rules/{rule_id}",
    summary="Delete rule",
    description="Permanently delete a rule from a workflow.",
)
def delete_rule_endpoint(
    rule_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.workflow_update)),
):
    return delete_rule(db, rule_id, user, tenant_id=user.tenant_id)


# ---------------------------------------------------------------------------
# Execution Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/{workflow_id}/execute",
    response_model=WorkflowExecutionOut,
    summary="Execute workflow for an entity",
    description="Manually trigger a workflow execution for a specific entity. "
                "Evaluates all active rules against the provided entity_data and records results.",
)
def execute_workflow_endpoint(
    workflow_id: int,
    entity_type: str = Query(..., description="Entity type: TASK, APPROVAL, PROJECT, or MEETING"),
    entity_id: int = Query(..., description="Entity ID to execute the workflow against"),
    entity_data: Optional[dict] = Body(None, description="Entity data for condition evaluation (e.g. {\"status\": \"overdue\", \"assigned_to\": \"user_123\"})"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.workflow_execute)),
):
    return execute_workflow(db, workflow_id, entity_type, entity_id, entity_data=entity_data, user=user, tenant_id=user.tenant_id)


@router.get(
    "/{workflow_id}/executions",
    response_model=Page[WorkflowExecutionOut],
    summary="List workflow executions",
    description="Retrieve execution history for a workflow. Optionally filter by status.",
)
def list_executions_endpoint(
    workflow_id: int,
    status: Optional[str] = Query(None, description="Filter by status: pending, running, completed, completed_with_warnings, failed"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.workflow_read)),
):
    return list_executions(db, tenant_id=user.tenant_id, workflow_id=workflow_id, status=status, page=page, size=size)
