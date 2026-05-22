from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CreditTransactionOut(BaseModel):
    id: int
    transaction_type: str
    feature: str
    credits_used: int
    balance_before: int
    balance_after: int
    description: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
