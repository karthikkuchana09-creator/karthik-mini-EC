import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.core.config import settings
from app.websocket.manager import manager
from app.websocket.auth import verify_ws_token
from app.websocket.events import EventType, BaseEvent
from app.core.log import get_logger

logger = get_logger("ws_api")
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    ws: WebSocket,
    token: str = Query(...),
):
    await ws.accept()

    ws_user = verify_ws_token(token)
    if ws_user is None:
        await ws.close(code=4001, reason="Invalid or expired token")
        return
    if not ws_user.is_active:
        await ws.close(code=4004, reason="User account is inactive")
        return

    client_host = ws.client.host if ws.client else ""
    user_agent = ""
    for k, v in ws.headers.raw:
        if k.decode().lower() == "user-agent":
            user_agent = v.decode()
            break

    conn = await manager.connect(
        user_id=ws_user.user_id,
        ws=ws,
        client_host=client_host,
        user_agent=user_agent,
        role=ws_user.role,
    )

    try:
        while True:
            raw = await ws.receive_text()

            if raw == "__ping__":
                await ws.send_text("__pong__")
                conn.touch()
                continue

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(
                    BaseEvent(
                        type=EventType.ERROR,
                        payload={"message": "Invalid JSON"},
                    ).model_dump_json()
                )
                continue

            event_type = data.get("type")
            if event_type == EventType.HEARTBEAT:
                await ws.send_text(
                    BaseEvent(
                        type=EventType.HEARTBEAT,
                        payload={"status": "ok"},
                    ).model_dump_json()
                )
                conn.touch()
                continue

            logger.debug("WS msg user_id=%d role=%s type=%s", ws_user.user_id, ws_user.role, event_type)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("WS error user_id=%d: %s", ws_user.user_id, exc)
    finally:
        await manager.disconnect(ws_user.user_id, ws)


@router.websocket("/ws/admin")
async def websocket_admin_endpoint(
    ws: WebSocket,
    token: str = Query(...),
):
    await ws.accept()

    ws_user = verify_ws_token(token)
    if ws_user is None:
        await ws.close(code=4001, reason="Invalid or expired token")
        return
    if not ws_user.is_active:
        await ws.close(code=4004, reason="User account is inactive")
        return
    if not ws_user.has_role("admin"):
        await ws.close(code=4003, reason="Role not allowed. Required: admin")
        return

    client_host = ws.client.host if ws.client else ""
    user_agent = ""
    for k, v in ws.headers.raw:
        if k.decode().lower() == "user-agent":
            user_agent = v.decode()
            break

    conn = await manager.connect(
        user_id=ws_user.user_id,
        ws=ws,
        client_host=client_host,
        user_agent=user_agent,
        role=ws_user.role,
    )

    try:
        while True:
            raw = await ws.receive_text()

            if raw == "__ping__":
                await ws.send_text("__pong__")
                conn.touch()
                continue

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(
                    BaseEvent(
                        type=EventType.ERROR,
                        payload={"message": "Invalid JSON"},
                    ).model_dump_json()
                )
                continue

            event_type = data.get("type")
            if event_type == EventType.HEARTBEAT:
                await ws.send_text(
                    BaseEvent(
                        type=EventType.HEARTBEAT,
                        payload={"status": "ok"},
                    ).model_dump_json()
                )
                conn.touch()
                continue

            logger.debug("WS admin msg user_id=%d type=%s", ws_user.user_id, event_type)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("WS admin error user_id=%d: %s", ws_user.user_id, exc)
    finally:
        await manager.disconnect(ws_user.user_id, ws)
