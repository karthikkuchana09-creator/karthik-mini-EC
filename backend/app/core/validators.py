import re
from datetime import date, datetime
from enum import Enum
from typing import Any, Optional, Union

from pydantic import FieldValidationInfo, field_validator


# ── Length constants ───────────────────────────────────────────────

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
NAME_MAX_LENGTH = 100
TITLE_MAX_LENGTH = 255
DESCRIPTION_MAX_LENGTH = 2000
COMMENT_MAX_LENGTH = 5000
REASON_MAX_LENGTH = 1000
PROMPT_MAX_LENGTH = 5000
EMAIL_MAX_LENGTH = 255
PHONE_MAX_LENGTH = 20
URL_MAX_LENGTH = 2048


# ── Common allowed-value enums ─────────────────────────────────────

class OrderDirection(str, Enum):
    asc = "asc"
    desc = "desc"


class EntityStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    archived = "archived"


# ── Boolean / optional helpers ─────────────────────────────────────

def validate_optional_str(v: Any) -> Optional[str]:
    """Coerce None/empty to None, otherwise return stripped string."""
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    return str(v).strip()


def validate_optional_int(v: Any) -> Optional[int]:
    """Coerce None/empty to None, otherwise return int."""
    if v is None or v == "":
        return None
    return int(v)


def str_to_bool(v: Any) -> bool:
    """Accept a variety of truthy/falsy string representations."""
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.lower() in ("1", "true", "yes", "on", "y")
    return bool(v)


# ── Password ───────────────────────────────────────────────────────

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


# ── String validation factories ────────────────────────────────────

def string_length(min_len: int = 1, max_len: int = 255):
    def validator(v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Must be a string")
        if len(v) < min_len:
            raise ValueError(f"Must be at least {min_len} characters")
        if len(v) > max_len:
            raise ValueError(f"Must not exceed {max_len} characters")
        return v
    return validator


def string_pattern(pattern: str, message: Optional[str] = None):
    """Validate a string matches a regex pattern."""
    def validator(v: str) -> str:
        if not re.match(pattern, v):
            raise ValueError(message or f"Must match pattern: {pattern}")
        return v
    return validator


def one_of(allowed: set[str], case_sensitive: bool = True):
    """Validate a value is one of the allowed set."""
    def validator(v: str) -> str:
        if not case_sensitive:
            v_lower = v.lower()
            if v_lower not in {x.lower() for x in allowed}:
                raise ValueError(f"Must be one of: {', '.join(sorted(allowed))}")
        elif v not in allowed:
            raise ValueError(f"Must be one of: {', '.join(sorted(allowed))}")
        return v
    return validator


def non_empty_string(v: str) -> str:
    if not isinstance(v, str) or not v.strip():
        raise ValueError("Must not be empty")
    return v.strip()


# ── Name / text safety ─────────────────────────────────────────────

def validate_safe_name(v: str) -> str:
    if not re.match(r"^[a-zA-Z0-9\s\-'.]+$", v):
        raise ValueError("Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods")
    return v


def validate_safe_text(v: str) -> str:
    if re.search(r"<[^>]*>", v):
        raise ValueError("HTML tags are not allowed")
    return v


# ── Date / datetime ────────────────────────────────────────────────

def validate_future_date(v: date) -> date:
    if v < date.today():
        raise ValueError("Date must be in the future")
    return v


def validate_future_datetime(v: datetime) -> datetime:
    if v < datetime.utcnow():
        raise ValueError("Date must be in the future")
    return v


def validate_past_date(v: date) -> date:
    if v >= date.today():
        raise ValueError("Date must be in the past")
    return v


# ── Numeric ────────────────────────────────────────────────────────

def validate_positive_int(v: Optional[int]) -> Optional[int]:
    if v is not None and v <= 0:
        raise ValueError("Value must be positive")
    return v


def validate_range(min_val: Union[int, float] = 0, max_val: Union[int, float] = 100):
    """Validate a numeric value falls within a range."""
    def validator(v: Union[int, float]) -> Union[int, float]:
        if v < min_val or v > max_val:
            raise ValueError(f"Must be between {min_val} and {max_val}")
        return v
    return validator


# ── Email ──────────────────────────────────────────────────────────

_EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def validate_email(v: str) -> str:
    if not _EMAIL_REGEX.match(v):
        raise ValueError("Invalid email format")
    if len(v) > EMAIL_MAX_LENGTH:
        raise ValueError(f"Email must not exceed {EMAIL_MAX_LENGTH} characters")
    return v.lower()


# ── URL ────────────────────────────────────────────────────────────

_URL_REGEX = re.compile(
    r"^https?:\/\/([\w.-]+)(:\d+)?(\/[^\s]*)?$",
    re.IGNORECASE,
)


def validate_url(v: str) -> str:
    if not _URL_REGEX.match(v):
        raise ValueError("Invalid URL format")
    if len(v) > URL_MAX_LENGTH:
        raise ValueError(f"URL must not exceed {URL_MAX_LENGTH} characters")
    return v


# ── Phone ──────────────────────────────────────────────────────────

_PHONE_REGEX = re.compile(r"^\+?[\d\s\-().]{7,}$")


def validate_phone(v: str) -> str:
    if not _PHONE_REGEX.match(v):
        raise ValueError("Invalid phone number format")
    if len(v) > PHONE_MAX_LENGTH:
        raise ValueError(f"Phone must not exceed {PHONE_MAX_LENGTH} characters")
    return v.strip()
