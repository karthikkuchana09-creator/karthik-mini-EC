from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.schemas.task import TaskCreate, TaskUpdate, KanbanReorderRequest, TaskStatusChangeRequest
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
    update_task_status,
)
from app.models.task import Task
from app.websocket.manager import manager
from app.websocket.kanban import build_kanban_task_data, KanbanAction, detect_conflict

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
    body: TaskStatusChangeRequest,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.task_update_status))
):
    task = db.query(Task).options(
        joinedload(Task.assignee), joinedload(Task.creator)
    ).filter(Task.id == task_id).first()

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
        task = db.query(Task).filter(Task.id == item.id).first()
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
