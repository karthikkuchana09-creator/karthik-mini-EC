from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.core.sanitizer import sanitize_text


class MeetingNoteCreate(BaseModel):
    content: str = Field(min_length=1)


class MeetingNoteUpdate(BaseModel):
    content: str = Field(min_length=1)


class MeetingNoteResponse(BaseModel):
    id: int
    meeting_id: int
    content: str
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
