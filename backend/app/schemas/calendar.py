from datetime import datetime, date, time
from typing import Optional
from pydantic import BaseModel


class CalendarEvent(BaseModel):
    event_type: str
    id: int
    title: str
    description: Optional[str] = None
    event_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[str] = None
    url: Optional[str] = None

    class Config:
        from_attributes = True
