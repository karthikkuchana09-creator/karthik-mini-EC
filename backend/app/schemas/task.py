from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


# ✅ Allowed values
TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["low", "medium", "high"]


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = "medium"
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[int] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime]
    created_by_id: int
    assigned_to_id: Optional[int]

    class Config:
        from_attributes = True


class TaskAssign(BaseModel):
    assigned_to_id: int


class TaskStatusUpdate(BaseModel):
    status: TaskStatus   