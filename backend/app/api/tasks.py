from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.task import TaskCreate, TaskUpdate
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.task_service import (
    create_task,
    get_tasks,
    get_kanban_view,
    get_task_by_id,
    update_task,
    delete_task,
    assign_task,
    update_task_status
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("/")
def create_task_endpoint(
    task: TaskCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_create))
):
    return create_task(db, task, user)


@router.get("/")
def get_tasks_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_read)),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc"),
    search: Optional[str] = Query(None),
):
    return get_tasks(db, user, page=page, size=size, sort_by=sort_by, sort_order=sort_order, search=search)


@router.get("/kanban")
def get_kanban_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_read))
):
    return get_kanban_view(db)


@router.get("/{task_id}")
def get_task_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_read))
):
    return get_task_by_id(db, task_id, user)


@router.put("/{task_id}")
def update_task_endpoint(
    task_id: int,
    updated: TaskUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_update))
):
    return update_task(db, task_id, updated, user)


@router.delete("/{task_id}")
def delete_task_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_delete))
):
    return delete_task(db, task_id, user)


@router.patch("/{task_id}/assign")
def assign_task_endpoint(
    task_id: int,
    assigned_to_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_assign))
):
    return assign_task(db, task_id, assigned_to_id, user)


@router.patch("/{task_id}/status")
def update_task_status_endpoint(
    task_id: int,
    status: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_update_status))
):
    return update_task_status(db, task_id, status, user)
