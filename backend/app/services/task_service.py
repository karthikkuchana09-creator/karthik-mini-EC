from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.user import User

def assign_task(db: Session, task_id: int, assigned_to_id: int, current_user):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    # Only Admin or Manager can assign
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(403, "Not allowed to assign tasks")

    user = db.query(User).filter(User.id == assigned_to_id).first()

    if not user:
        raise HTTPException(404, "User not found")

    task.assigned_to_id = assigned_to_id
    db.commit()
    db.refresh(task)

    return task

def update_task_status(db: Session, task_id: int, new_status: str, current_user):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(404, "Task not found")

    # 🔐 RBAC RULES
    if current_user.role == "employee":
        if task.assigned_to_id != current_user.id:
            raise HTTPException(403, "You can only update your assigned tasks")

    elif current_user.role == "manager":
        if task.created_by_id != current_user.id and task.assigned_to_id != current_user.id:
            raise HTTPException(403, "Not allowed")

    # Admin → no restriction

    task.status = new_status
    db.commit()
    db.refresh(task)

    return task    