import json
from fastapi import WebSocket
from typing import Dict, List
from app.core.log import get_logger

logger = get_logger("ws_manager")


class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)
        logger.info("WebSocket connected: user_id=%d total=%d", user_id, len(self.active[user_id]))

    def disconnect(self, user_id: int, ws: WebSocket):
        conns = self.active.get(user_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self.active.pop(user_id, None)
        logger.info("WebSocket disconnected: user_id=%d", user_id)

    async def send_notification(self, user_id: int, message: str, notification_id: int):
        payload = json.dumps({
            "type": "notification",
            "id": notification_id,
            "message": message,
        })
        conns = self.active.get(user_id, [])
        for ws in conns[:]:
            try:
                await ws.send_text(payload)
            except Exception:
                conns.remove(ws)

    async def broadcast(self, message: str):
        for user_id in list(self.active.keys()):
            await self.send_notification(user_id, message, 0)


manager = ConnectionManager()
