from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate
from datetime import datetime
from app.core.workflow import validate_transition
from app.core.log import get_logger
from app.core.cache import cache_delete_pattern
from app.services.audit_log_service import log_action
from app.services.notification_service import (
    create_task_assignment_notification,
    create_task_status_notification,
)
from app.utils.pagination import paginate_query
from fastapi.encoders import jsonable_encoder
from app.websocket.manager import manager
from app.websocket.kanban import build_kanban_task_data, KanbanAction, detect_conflict

logger = get_logger("task_service")


def _emit_kanban(action: KanbanAction, task, previous_status: str | None = None):
    import asyncio
    task_data = build_kanban_task_data(task).model_dump()
    event = {
        "action": action.value,
        "task": task_data,
        "source_column": previous_status,
        "destination_column": task.status if hasattr(task, "status") else None,
        "previous_status": previous_status,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
    }
    asyncio.ensure_future(manager.notify_kanban(event))


def _invalidate_task_caches():
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(cache_delete_pattern("dashboard:*"))
        loop.run_until_complete(cache_delete_pattern("ai:summary:*"))
    finally:
        loop.close()


def create_task(db: Session, task_data: TaskCreate, current_user):
    logger.info("Creating task: title=%s assigned_to=%d by user_id=%d",
                task_data.title, task_data.assigned_to_id, current_user.id)

    assigned_user = db.query(User).filter(User.id == task_data.assigned_to_id).first()
    if not assigned_user:
        logger.warning("Task creation failed: assigned user not found user_id=%d", task_data.assigned_to_id)
        raise HTTPException(404, "Assigned user not found")

    new_task = Task(
        title=task_data.title,
        description=task_data.description,
        status="todo",
        priority=task_data.priority,
        due_date=task_data.due_date,
        created_by_id=current_user.id,
        assigned_to_id=task_data.assigned_to_id
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    log_action(
        db, current_user.id, "create", "task", new_task.id,
        new_value={"title": new_task.title, "status": "todo", "priority": new_task.priority, "assigned_to_id": new_task.assigned_to_id},
    )
    create_task_assignment_notification(db, task_data.assigned_to_id, new_task.id, new_task.title)
    _emit_kanban(KanbanAction.TASK_CREATED, new_task)
    logger.info("Task created successfully id=%d title=%s", new_task.id, new_task.title)
    _invalidate_task_caches()
    return new_task


def get_tasks(
    db: Session,
    current_user,
    page: int = 1,
    size: int = 20,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
    search: Optional[str] = None,
):
    logger.debug("Fetching tasks for user_id=%d role=%s", current_user.id, current_user.role)
    query = db.query(Task).options(joinedload(Task.assignee))

    if current_user.role == "admin":
        pass
    elif current_user.role == "manager":
        query = query.filter(
            (Task.created_by_id == current_user.id) |
            (Task.assigned_to_id == current_user.id)
        )
    else:
        query = query.filter(Task.assigned_to_id == current_user.id)

    result = paginate_query(
        db, query,
        page=page, size=size,
        sort_by=sort_by, sort_order=sort_order,
        search=search, search_columns=[Task.title, Task.description],
    )

    result["items"] = jsonable_encoder(result["items"])
    logger.debug("Fetched %d tasks for user_id=%d", len(result["items"]), current_user.id)
    return result


def get_kanban_view(db: Session):
    tasks = db.query(Task).all()
    logger.debug("Kanban view: %d total tasks", len(tasks))

    return {
        "todo": [t for t in tasks if t.status == "todo"],
        "in_progress": [t for t in tasks if t.status == "in_progress"],
        "review": [t for t in tasks if t.status == "review"],
        "done": [t for t in tasks if t.status == "done"],
    }


def get_task_by_id(db: Session, task_id: int, current_user):
    logger.debug("Fetching task id=%d by user_id=%d", task_id, current_user.id)
    task = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.creator)
    ).filter(Task.id == task_id).first()

    if not task:
        logger.warning("Task not found id=%d", task_id)
        raise HTTPException(404, "Task not found")

    if current_user.role == "employee" and task.assigned_to_id != current_user.id:
        logger.warning("Employee user_id=%d not allowed to view task id=%d", current_user.id, task_id)
        raise HTTPException(403, "Not allowed")

    return jsonable_encoder(task)


def update_task(db: Session, task_id: int, task_data: TaskUpdate, current_user):
    logger.info("Updating task id=%d by user_id=%d", task_id, current_user.id)
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        logger.warning("Task update failed: not found id=%d", task_id)
        raise HTTPException(404, "Task not found")

    if current_user.role == "employee":
        if task.assigned_to_id != current_user.id:
            logger.warning("Employee user_id=%d not authorized to update task id=%d", current_user.id, task_id)
            raise HTTPException(403, "Not allowed")

        if task_data.status:
            task.status = task_data.status
            task.updated_at = datetime.utcnow()
        else:
            raise HTTPException(403, "You can only update status")

    else:
        for key, value in task_data.dict(exclude_unset=True).items():
            setattr(task, key, value)

        task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    log_action(
        db, current_user.id, "update", "task", task_id,
        old_value={"title": task.title, "status": task.status},
        new_value=task_data.dict(exclude_unset=True) if not current_user.role == "employee" else {"status": task.status},
    )
    if task.assigned_to_id:
        create_task_status_notification(db, task.assigned_to_id, task_id, task.title, task.status)
    _emit_kanban(KanbanAction.TASK_UPDATED, task)
    logger.info("Task id=%d updated successfully", task_id)
    _invalidate_task_caches()
    return jsonable_encoder(task)


def delete_task(db: Session, task_id: int, current_user):
    logger.info("Deleting task id=%d", task_id)
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        logger.warning("Task delete failed: not found id=%d", task_id)
        raise HTTPException(404, "Task not found")

    deleted = {"title": task.title, "status": task.status, "priority": task.priority, "assigned_to_id": task.assigned_to_id}
    db.delete(task)
    db.commit()

    log_action(db, current_user.id, "delete", "task", task_id, old_value=deleted)
    _emit_kanban(KanbanAction.TASK_DELETED, task)
    logger.info("Task id=%d deleted successfully", task_id)
    _invalidate_task_caches()
    return {"message": "Task deleted"}


def assign_task(db: Session, task_id: int, assigned_to_id: int, current_user):
    logger.info("Assigning task id=%d to user_id=%d", task_id, assigned_to_id)
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        logger.warning("Task assign failed: task not found id=%d", task_id)
        raise HTTPException(404, "Task not found")

    assigned_user = db.query(User).filter(User.id == assigned_to_id).first()
    if not assigned_user:
        logger.warning("Task assign failed: user not found user_id=%d", assigned_to_id)
        raise HTTPException(404, "User not found")

    if assigned_user.role == "admin":
        logger.warning("Task assign failed: cannot assign to admin user_id=%d", assigned_to_id)
        raise HTTPException(400, "Cannot assign task to admin")

    task.assigned_to_id = assigned_to_id
    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    log_action(
        db, current_user.id, "assign", "task", task_id,
        old_value={"assigned_to_id": task.assigned_to_id},
        new_value={"assigned_to_id": assigned_to_id},
    )
    create_task_assignment_notification(db, assigned_to_id, task_id, task.title)
    _emit_kanban(KanbanAction.TASK_UPDATED, task)
    logger.info("Task id=%d assigned to user_id=%d successfully", task_id, assigned_to_id)
    _invalidate_task_caches()
    return {"message": "Task assigned successfully"}


def update_task_status(db: Session, task_id: int, new_status: str, current_user):
    logger.info("Updating task id=%d status to %s by user_id=%d", task_id, new_status, current_user.id)
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        logger.warning("Status update failed: task not found id=%d", task_id)
        raise HTTPException(404, "Task not found")

    if current_user.role == "employee" and task.assigned_to_id != current_user.id:
        logger.warning("Employee user_id=%d cannot update task id=%d status", current_user.id, task_id)
        raise HTTPException(403, "You can only update your tasks")

    if not validate_transition(task.status, new_status):
        logger.warning("Invalid status transition: %s -> %s for task id=%d", task.status, new_status, task_id)
        raise HTTPException(
            400,
            f"Invalid transition: {task.status} \u2192 {new_status}"
        )

    previous_status = task.status
    task.status = new_status
    task.updated_by = current_user.id

    db.commit()
    db.refresh(task)

    log_action(
        db, current_user.id, "status_update", "task", task_id,
        old_value={"status": previous_status},
        new_value={"status": new_status},
    )
    if task.assigned_to_id and task.assigned_to_id != current_user.id:
        create_task_status_notification(db, task.assigned_to_id, task_id, task.title, new_status)
    _emit_kanban(KanbanAction.TASK_STATUS_CHANGED, task, previous_status=previous_status)
    logger.info("Task id=%d status updated to %s successfully", task_id, new_status)
    _invalidate_task_caches()
    return {"message": "Status updated successfully"}
