from pydantic import BaseModel, EmailStr
from typing import Literal


# ✅ Match backend Enum
UserRole = Literal["admin", "manager", "employee"]


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole   # ✅ FIXED


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole   # ✅ FIXED

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool = True


