from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, KanbanResponse
from datetime import datetime
from app.core.workflow import validate_transition
from fastapi.encoders import jsonable_encoder


def create_task(db: Session, task_data: TaskCreate, current_user):
    assigned_user = db.query(User).filter(User.id == task_data.assigned_to_id).first()
    if not assigned_user:
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

    return new_task


def get_tasks(db: Session, current_user):
    query = db.query(Task).options(joinedload(Task.assignee))

    if current_user.role == "admin":
        tasks = query.all()
    elif current_user.role == "manager":
        tasks = query.filter(
            (Task.created_by_id == current_user.id) |
            (Task.assigned_to_id == current_user.id)
        ).all()
    else:
        tasks = query.filter(
            Task.assigned_to_id == current_user.id
        ).all()

    return jsonable_encoder(tasks)


def get_kanban_view(db: Session):
    tasks = db.query(Task).all()

    return {
        "todo": [t for t in tasks if t.status == "todo"],
        "in_progress": [t for t in tasks if t.status == "in_progress"],
        "review": [t for t in tasks if t.status == "review"],
        "done": [t for t in tasks if t.status == "done"],
    }


def get_task_by_id(db: Session, task_id: int, current_user):
    task = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.creator)
    ).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    if current_user.role == "employee" and task.assigned_to_id != current_user.id:
        raise HTTPException(403, "Not allowed")

    return jsonable_encoder(task)


def update_task(db: Session, task_id: int, task_data: TaskUpdate, current_user):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    if current_user.role == "employee":
        if task.assigned_to_id != current_user.id:
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

    return jsonable_encoder(task)


def delete_task(db: Session, task_id: int):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    db.delete(task)
    db.commit()

    return {"message": "Task deleted"}


def assign_task(db: Session, task_id: int, assigned_to_id: int):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    assigned_user = db.query(User).filter(User.id == assigned_to_id).first()
    if not assigned_user:
        raise HTTPException(404, "User not found")

    if assigned_user.role == "admin":
        raise HTTPException(400, "Cannot assign task to admin")

    task.assigned_to_id = assigned_to_id
    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    return {"message": "Task assigned successfully"}


def update_task_status(db: Session, task_id: int, new_status: str, current_user):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    if current_user.role == "employee" and task.assigned_to_id != current_user.id:
        raise HTTPException(403, "You can only update your tasks")

    if not validate_transition(task.status, new_status):
        raise HTTPException(
            400,
            f"Invalid transition: {task.status} → {new_status}"
        )

    task.status = new_status
    task.updated_by = current_user.id

    db.commit()
    db.refresh(task)

    return {"message": "Status updated successfully"}
