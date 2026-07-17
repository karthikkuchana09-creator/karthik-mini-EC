import time
import threading
from typing import Optional
from sqlalchemy.orm import Session

FAILED_LOGIN_THRESHOLD = 5
FAILED_LOGIN_WINDOW = 300
TOKEN_REUSE_THRESHOLD = 1

_lock = threading.Lock()
_failed_attempts: dict[str, list[float]] = {}
_token_reuse_counts: dict[str, int] = {}


def _cleanup_expired(window: int):
    now = time.time()
    for key in list(_failed_attempts.keys()):
        _failed_attempts[key] = [t for t in _failed_attempts[key] if now - t < window]
        if not _failed_attempts[key]:
            del _failed_attempts[key]


def record_failed_login(identifier: str, ip: Optional[str] = None) -> bool:
    global _failed_attempts
    now = time.time()
    key = f"login:{identifier}"
    with _lock:
        _cleanup_expired(FAILED_LOGIN_WINDOW)
        if key not in _failed_attempts:
            _failed_attempts[key] = []
        _failed_attempts[key].append(now)
        count = len(_failed_attempts[key])
        if count >= FAILED_LOGIN_THRESHOLD:
            return True
    return False


def record_token_reuse(token_hash: str, db: Session, user_id: Optional[int] = None) -> bool:
    from app.services.audit_log_service import log_action
    global _token_reuse_counts
    key = f"reuse:{token_hash}"
    with _lock:
        _token_reuse_counts[key] = _token_reuse_counts.get(key, 0) + 1
        count = _token_reuse_counts[key]
        if count >= TOKEN_REUSE_THRESHOLD:
            log_action(
                db, user_id or 0, "security:token_replay_detected", "auth",
                0, new_value={"token_hash_prefix": token_hash[:12], "reuse_count": count},
            )
            return True
    return False


def record_reset_token_reuse(token_hash: str, db: Session, user_id: Optional[int] = None):
    from app.services.audit_log_service import log_action
    log_action(
        db, user_id or 0, "security:reset_token_reuse", "auth",
        0, new_value={"token_hash_prefix": token_hash[:12]},
    )


def log_suspicious_login(db: Session, email: str, ip: Optional[str] = None, reason: str = "brute_force"):
    from app.services.audit_log_service import log_action
    log_action(
        db, 0, f"security:suspicious_login:{reason}", "auth",
        0, new_value={"email": email, "ip": ip},
    )
