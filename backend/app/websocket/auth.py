from dataclasses import dataclass
from typing import Optional
from fastapi import WebSocket, status
from app.core.security import decode_token
from app.core.config import settings
from app.core.log import get_logger
from app.core.rbac import ROLE_PERMISSIONS, has_permission

logger = get_logger("ws_auth")

WS_CLOSE_INVALID_TOKEN = status.WS_1008_POLICY_VIOLATION
WS_CLOSE_EXPIRED_TOKEN = 4002
WS_CLOSE_FORBIDDEN = 4003
WS_CLOSE_INACTIVE_USER = 4004


@dataclass
class WebSocketUser:
    user_id: int
    role: str
    email: str = ""
    name: str = ""
    is_active: bool = True

    def has_permission(self, permission: str) -> bool:
        return has_permission(self, permission)

    def has_role(self, *roles: str) -> bool:
        return self.role in roles


def verify_ws_token(token: str) -> Optional[WebSocketUser]:
    payload = decode_token(token)
    if payload is None:
        return None

    user_id = payload.get("user_id")
    role = payload.get("role", "")
    email = payload.get("email", "")
    name = payload.get("name", "")

    if user_id is None:
        return None

    token_type = payload.get("type", "")
    exp = payload.get("exp")

    if token_type and token_type != "access_token":
        logger.warning("WS auth rejected: invalid token type=%s", token_type)
        return None

    return WebSocketUser(user_id=user_id, role=role, email=email, name=name)


async def reject_ws(
    ws: WebSocket, code: int = WS_CLOSE_INVALID_TOKEN, reason: str = "Unauthorized"
):
    try:
        await ws.close(code=code, reason=reason)
    except Exception:
        pass


async def verify_ws_token_or_close(ws: WebSocket, token: str) -> Optional[WebSocketUser]:
    ws_user = verify_ws_token(token)
    if ws_user is None:
        await reject_ws(ws, WS_CLOSE_INVALID_TOKEN, "Invalid or expired token")
        return None
    if not ws_user.is_active:
        await reject_ws(ws, WS_CLOSE_INACTIVE_USER, "User account is inactive")
        return None
    return ws_user


def require_ws_role(*allowed_roles: str):
    async def checker(ws: WebSocket, token: str) -> Optional[WebSocketUser]:
        ws_user = verify_ws_token(token)
        if ws_user is None:
            await reject_ws(ws, WS_CLOSE_INVALID_TOKEN, "Invalid or expired token")
            return None
        if not ws_user.has_role(*allowed_roles):
            await reject_ws(
                ws,
                WS_CLOSE_FORBIDDEN,
                f"Role not allowed. Required: {', '.join(allowed_roles)}",
            )
            return None
        return ws_user
    return checker
