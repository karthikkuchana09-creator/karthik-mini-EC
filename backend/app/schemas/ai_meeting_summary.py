from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class AIMeetingSummaryCreate(BaseModel):
    summary: str
    action_items: Optional[str] = None
    key_decisions: Optional[str] = None


class AIMeetingSummaryUpdate(BaseModel):
    summary: Optional[str] = None
    action_items: Optional[str] = None
    key_decisions: Optional[str] = None


class AIMeetingSummaryResponse(BaseModel):
    id: int
    meeting_id: int
    summary: str
    action_items: Optional[str] = None
    key_decisions: Optional[str] = None
    generated_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
