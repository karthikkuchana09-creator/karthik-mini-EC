from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from app.core.sanitizer import SanitizedStr


class WorkflowRuleCreate(BaseModel):
    name: SanitizedStr
    description: Optional[SanitizedStr] = None
    condition_config: dict = Field(default_factory=dict, description="JSON defining when rule triggers (field, operator, value, time_delay)")
    action_config: dict = Field(default_factory=dict, description="JSON defining what action to take (type, params)")
    priority: int = 0
    is_active: bool = True


class WorkflowRuleUpdate(BaseModel):
    name: Optional[SanitizedStr] = None
    description: Optional[SanitizedStr] = None
    condition_config: Optional[dict] = None
    action_config: Optional[dict] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class WorkflowRuleOut(BaseModel):
    id: int
    workflow_id: int
    name: str
    description: Optional[str] = None
    condition_config: dict
    action_config: dict
    priority: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowCreate(BaseModel):
    name: str = Field(..., description="Workflow name")
    description: Optional[str] = Field(None, description="Description of the workflow")
    entity_type: str = Field(..., description="Entity type this workflow applies to: TASK, APPROVAL, PROJECT, or MEETING")
    trigger_event: Optional[str] = Field(None, description="Trigger event: on_create, on_update, on_status_change, on_overdue, on_approval_pending, manual")
    status: str = Field("active", description="Workflow status: active or inactive")
    config: Optional[dict] = Field(None, description="Additional workflow configuration")


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    entity_type: Optional[str] = None
    trigger_event: Optional[str] = None
    status: Optional[str] = None
    config: Optional[dict] = None


class WorkflowOut(BaseModel):
    id: int
    tenant_id: int
    name: str
    description: Optional[str] = None
    entity_type: str
    trigger_event: Optional[str] = None
    status: str
    is_deleted: bool
    config: Optional[dict] = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    rules: list[WorkflowRuleOut] = []

    class Config:
        from_attributes = True


class WorkflowExecutionOut(BaseModel):
    id: int
    workflow_id: int
    entity_type: str
    entity_id: int
    trigger_event: Optional[str] = None
    status: str
    result_log: Optional[Any] = None
    error_message: Optional[str] = None
    started_by: Optional[int] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
