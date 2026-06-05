from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class ChannelMemberResponse(BaseModel):
    id: int
    channel_id: int
    user_id: int
    joined_at: datetime
    is_muted: bool
    last_read_message_id: Optional[int] = None

    model_config = {"from_attributes": True}
