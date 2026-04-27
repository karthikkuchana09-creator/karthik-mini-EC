from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate
from app.api.deps import get_db, get_current_user, require_roles
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ✅ CREATE TASK (Admin + Manager)
@router.post("/")
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager"]))
):
    # check assigned user exists
    assigned_user = db.query(User).filter(User.id == task.assigned_to_id).first()
    if not assigned_user:
        raise HTTPException(404, "Assigned user not found")

    new_task = Task(
        title=task.title,
        description=task.description,
        status="todo",
        priority=task.priority,
        due_date=task.due_date,
        created_by_id=user.id,
        assigned_to_id=task.assigned_to_id
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task


# ✅ GET TASKS (ROLE BASED)
@router.get("/")
def get_tasks(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if user.role == "admin":
        return db.query(Task).all()

    elif user.role == "manager":
        return db.query(Task).filter(
            (Task.created_by_id == user.id) |
            (Task.assigned_to_id == user.id)
        ).all()

    else:  # employee
        return db.query(Task).filter(
            Task.assigned_to_id == user.id
        ).all()


# ✅ GET SINGLE TASK
@router.get("/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    if user.role == "employee" and task.assigned_to_id != user.id:
        raise HTTPException(403, "Not allowed")

    return task


# ✅ UPDATE TASK
@router.put("/{task_id}")
def update_task(
    task_id: int,
    updated: TaskUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    # ❌ EMPLOYEE restriction
    if user.role == "employee":
        if task.assigned_to_id != user.id:
            raise HTTPException(403, "Not allowed")

        # employee can only update status
        if updated.status:
            task.status = updated.status
            task.updated_at = datetime.utcnow()
        else:
            raise HTTPException(403, "You can only update status")

    else:
        # admin/manager full update
        for key, value in updated.dict(exclude_unset=True).items():
            setattr(task, key, value)

        task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    return task


# ✅ DELETE TASK (Admin only)
@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin"]))
):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    db.delete(task)
    db.commit()

    return {"message": "Task deleted"}


# ✅ ASSIGN TASK
@router.patch("/{task_id}/assign")
def assign_task(
    task_id: int,
    assigned_to_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager"]))
):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    assigned_user = db.query(User).filter(User.id == assigned_to_id).first()
    if not assigned_user:
        raise HTTPException(404, "User not found")

    # ❌ prevent assigning to admin
    if assigned_user.role == "admin":
        raise HTTPException(400, "Cannot assign task to admin")

    task.assigned_to_id = assigned_to_id
    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    return {"message": "Task assigned successfully"}