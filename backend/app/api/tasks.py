from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.task import TaskCreate, TaskUpdate
from app.api.deps import get_db, get_current_user, require_roles
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
    user=Depends(require_roles(["admin", "manager"]))
):
    return create_task(db, task, user)


@router.get("/")
def get_tasks_endpoint(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return get_tasks(db, user)


@router.get("/kanban")
def get_kanban_endpoint(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return get_kanban_view(db)


@router.get("/{task_id}")
def get_task_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return get_task_by_id(db, task_id, user)


@router.put("/{task_id}")
def update_task_endpoint(
    task_id: int,
    updated: TaskUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return update_task(db, task_id, updated, user)


@router.delete("/{task_id}")
def delete_task_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin"]))
):
    return delete_task(db, task_id, user)


@router.patch("/{task_id}/assign")
def assign_task_endpoint(
    task_id: int,
    assigned_to_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager"]))
):
    return assign_task(db, task_id, assigned_to_id, user)


@router.patch("/{task_id}/status")
def update_task_status_endpoint(
    task_id: int,
    status: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return update_task_status(db, task_id, status, user)
