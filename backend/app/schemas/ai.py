from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.core.validators import string_length, PROMPT_MAX_LENGTH
from app.core.sanitizer import sanitize_prompt


class AIRequest(BaseModel):
    prompt: str
    task_id: Optional[int] = None
    context: Optional[str] = None

    @field_validator("prompt", mode="before")
    @classmethod
    def clean_prompt(cls, v):
        if isinstance(v, str):
            return sanitize_prompt(v)
        return v

    @field_validator("prompt")
    @classmethod
    def validate_prompt_length(cls, v):
        return string_length(1, PROMPT_MAX_LENGTH)(v)

    @field_validator("context", mode="before")
    @classmethod
    def clean_context(cls, v):
        if isinstance(v, str):
            return sanitize_prompt(v)
        return v


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


class InsightItem(BaseModel):
    type: str
    severity: str
    text: str


class RecommendationItem(BaseModel):
    severity: str
    message: str
    action: Optional[str] = None


class AISummaryOut(BaseModel):
    summary: str
    stats: dict
    insights: list[InsightItem] = []
    recommendations: list[RecommendationItem] = []


class HighPriorityTaskItem(BaseModel):
    id: int
    title: str
    status: str
    priority: str
    due_date: Optional[str] = None
    days_remaining: Optional[int] = None
    urgency_score: int = 0
    urgency_level: str = "low"
    assignee: Optional[str] = None
    assignee_name: Optional[str] = None


class HighPriorityTasksOut(BaseModel):
    total: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    tasks: list[HighPriorityTaskItem] = []
