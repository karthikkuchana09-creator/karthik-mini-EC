from typing import Optional, Literal, Any
from datetime import datetime
from pydantic import BaseModel, Field, model_validator

AttendeeStatusEnum = Literal["PENDING", "ACCEPTED", "DECLINED", "TENTATIVE"]


class MeetingAttendeeAddRequest(BaseModel):
    user_id: int = Field(gt=0)
    status: AttendeeStatusEnum = "PENDING"


class MeetingAttendeeResponse(BaseModel):
    id: int
    meeting_id: int
    user_id: int
    status: AttendeeStatusEnum
    joined_at: Optional[datetime] = None
    name: str = ""
    email: str = ""

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def populate_user_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        user = getattr(data, "user", None)
        if user is not None:
            data.name = user.name or ""
            data.email = user.email or ""
        return data
