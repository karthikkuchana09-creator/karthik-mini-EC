from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.schemas.sla_rule import SLARuleCreate, SLARuleUpdate, SLARuleResponse, SLARuleFilter
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.sla_rule_service import (
    list_sla_rules_filtered,
    create_sla_rule,
    get_sla_rule_by_id,
    update_sla_rule,
    delete_sla_rule,
)

router = APIRouter(prefix="/sla-rules", tags=["SLA Rules"])


@router.post("", response_model=SLARuleResponse)
def create_sla_rule_endpoint(
    rule: SLARuleCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_rule_create)),
):
    return create_sla_rule(db, rule, user)


@router.get("", response_model=Page[SLARuleResponse])
def list_sla_rules(
    module_name: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    created_by: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_rule_read)),
):
    filters = SLARuleFilter(
        module_name=module_name, priority=priority, is_active=is_active,
        created_by=created_by, q=q, sort_by=sort_by, sort_order=sort_order,
        page=page, size=size,
    )
    return list_sla_rules_filtered(db, filters)


@router.get("/{rule_id}", response_model=SLARuleResponse)
def get_sla_rule_endpoint(
    rule_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_rule_read)),
):
    return get_sla_rule_by_id(db, rule_id)


@router.put("/{rule_id}", response_model=SLARuleResponse)
def update_sla_rule_endpoint(
    rule_id: int,
    rule: SLARuleUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_rule_update)),
):
    return update_sla_rule(db, rule_id, rule, user)


@router.delete("/{rule_id}")
def delete_sla_rule_endpoint(
    rule_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.sla_rule_delete)),
):
    return delete_sla_rule(db, rule_id, user)
