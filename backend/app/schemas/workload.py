from pydantic import BaseModel


class UserWorkload(BaseModel):
    user_id: int
    user_name: str
    total: int
    pending: int
    completed: int
    overdue: int


class WorkloadResponse(BaseModel):
    total: int
    pending: int
    completed: int
    overdue: int
    users: list[UserWorkload]
