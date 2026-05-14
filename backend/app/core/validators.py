import re
from datetime import date, datetime
from typing import Optional

from pydantic import FieldValidationInfo, field_validator


PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
NAME_MAX_LENGTH = 100
TITLE_MAX_LENGTH = 255
DESCRIPTION_MAX_LENGTH = 2000
COMMENT_MAX_LENGTH = 5000
REASON_MAX_LENGTH = 1000
PROMPT_MAX_LENGTH = 5000


def validate_password_strength(password: str) -> str:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
    if len(password) > PASSWORD_MAX_LENGTH:
        raise ValueError(f"Password must not exceed {PASSWORD_MAX_LENGTH} characters")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/`~]", password):
        raise ValueError("Password must contain at least one special character")
    return password


def validate_strong_password(v: str) -> str:
    return validate_password_strength(v)


def string_length(min_len: int = 1, max_len: int = 255):
    def validator(v: str) -> str:
        if len(v) < min_len:
            raise ValueError(f"Must be at least {min_len} characters")
        if len(v) > max_len:
            raise ValueError(f"Must not exceed {max_len} characters")
        return v
    return validator


def validate_safe_name(v: str) -> str:
    if not re.match(r"^[a-zA-Z0-9\s\-'.]+$", v):
        raise ValueError("Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods")
    return v


def validate_safe_text(v: str) -> str:
    if re.search(r"<[^>]*>", v):
        raise ValueError("HTML tags are not allowed")
    return v


def validate_future_date(v: date) -> date:
    if v < date.today():
        raise ValueError("Date must be in the future")
    return v


def validate_future_datetime(v: datetime) -> datetime:
    if v < datetime.utcnow():
        raise ValueError("Date must be in the future")
    return v


def validate_positive_int(v: Optional[int]) -> Optional[int]:
    if v is not None and v <= 0:
        raise ValueError("Value must be positive")
    return v
