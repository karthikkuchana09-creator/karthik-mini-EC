from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AIRequest(BaseModel):
    prompt: str
    task_id: Optional[int] = None
    context: Optional[str] = None

class AIResponse(BaseModel):
    suggestion: str
    model_used: str
    tokens_used: int

class AIOut(BaseModel):
    id: int
    user_id: int
    task_id: Optional[int]
    prompt: str
    response: str
    model_name: str
    tokens_used: int
    created_at: datetime

    class Config:
        from_attributes = True

class AISummaryOut(BaseModel):
    summary: str
    stats: dict
