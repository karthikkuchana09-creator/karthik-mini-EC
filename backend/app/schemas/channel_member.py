from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, model_validator


class ChannelMemberResponse(BaseModel):
    id: int
    channel_id: int
    user_id: int
    joined_at: Optional[datetime] = None
    is_muted: bool = False
    last_read_message_id: Optional[int] = None
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
