from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from fastapi_pagination import Page
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, KanbanReorderRequest, TaskStatusChangeRequest
from app.routes.deps import get_db, get_current_user
from app.core.rbac import require_permission, Permissions
from app.core.subscription_access import check_create_limit
from app.services.task_service import (
    create_task,
    get_kanban_view,
    get_task_by_id,
    update_task,
    delete_task,
    assign_task,
    update_task_status,
)
from app.repository.task_repository import list_all_tasks
from app.models.task import Task
from app.websocket.manager import manager
from app.websocket.kanban import build_kanban_task_data, KanbanAction, detect_conflict

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("")
def create_task_endpoint(
    task: TaskCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_create)),
    _=Depends(check_create_limit("tasks")),
):
    return create_task(db, task, user)


@router.get("", response_model=Page[TaskOut])
def list_tasks(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return list_all_tasks(db)


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
    body: TaskStatusChangeRequest,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_update_status))
):
    task = db.scalar(
        select(Task)
        .options(joinedload(Task.assignee), joinedload(Task.creator))
        .where(Task.id == task_id)
    )

    if not task:
        raise HTTPException(404, "Task not found")

    conflict = detect_conflict(body.client_updated_at, task.updated_at.isoformat() if task.updated_at else None)
    if conflict.has_conflict:
        return {
            "conflict": True,
            "message": conflict.message,
            "server_task": build_kanban_task_data(task).model_dump(),
        }

    result = update_task_status(db, task_id, body.status, user)
    return {"conflict": False, "message": "Status updated", "task": result}


@router.post("/kanban/reorder")
def kanban_reorder_endpoint(
    body: KanbanReorderRequest,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_update_status)),
):
    import asyncio
    updated_tasks = []
    for item in body.items:
        task = db.scalar(select(Task).where(Task.id == item.id))
        if task and task.status != item.status:
            task.status = item.status
            task.updated_at = __import__("datetime").datetime.utcnow()
            db.flush()
            updated_tasks.append(task)

    db.commit()

    for task in updated_tasks:
        db.refresh(task)
        task_data = build_kanban_task_data(task).model_dump()
        event = {
            "action": KanbanAction.TASK_REORDERED.value,
            "task": task_data,
            "destination_column": task.status,
            "task_index": next(
                (it.index for it in body.items if it.id == task.id), None
            ),
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        }
        asyncio.ensure_future(manager.notify_kanban(event))

    return {"message": f"{len(updated_tasks)} tasks reordered"}
