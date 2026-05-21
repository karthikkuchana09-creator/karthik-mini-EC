import json
import asyncio
from datetime import datetime
from dataclasses import dataclass, field
from typing import Any, Optional
from fastapi import WebSocket
from app.core.log import get_logger
from app.websocket.events import BaseEvent, EventType
from app.websocket.pubsub import ws_pubsub

logger = get_logger("ws_manager")

PING_INTERVAL = 25
PING_TIMEOUT = 10


@dataclass
class Connection:
    ws: WebSocket
    user_id: int
    role: str = ""
    connected_at: float = field(default_factory=lambda: datetime.utcnow().timestamp())
    client_host: str = ""
    user_agent: str = ""
    last_activity: float = field(default_factory=lambda: datetime.utcnow().timestamp())

    @property
    def age_seconds(self) -> float:
        return datetime.utcnow().timestamp() - self.connected_at

    @property
    def idle_seconds(self) -> float:
        return datetime.utcnow().timestamp() - self.last_activity

    def touch(self):
        self.last_activity = datetime.utcnow().timestamp()


class ConnectionManager:
    def __init__(self):
        self._connections: dict[int, list[Connection]] = {}
        self._lock = asyncio.Lock()

    def register_pubsub_handlers(self):
        """Register cross-process pub/sub handlers to forward messages to local connections."""
        from app.websocket.pubsub import ws_pubsub

        async def _on_broadcast(data: dict):
            payload = json.dumps(data)
            async with self._lock:
                all_conns = [c for cs in self._connections.values() for c in cs]
            for conn in all_conns:
                try:
                    await conn.ws.send_text(payload)
                    conn.touch()
                except Exception:
                    await self._remove_stale(conn)

        async def _on_user_message(user_id: int, data: dict):
            payload = json.dumps(data)
            async with self._lock:
                conns = list(self._connections.get(user_id, []))
            for conn in conns:
                try:
                    await conn.ws.send_text(payload)
                    conn.touch()
                except Exception:
                    await self._remove_stale(conn)

        async def _on_role_message(role: str, data: dict):
            payload = json.dumps(data)
            async with self._lock:
                all_conns = [c for cs in self._connections.values()
                             for c in cs if c.role == role]
            for conn in all_conns:
                try:
                    await conn.ws.send_text(payload)
                    conn.touch()
                except Exception:
                    await self._remove_stale(conn)

        ws_pubsub.on_broadcast(_on_broadcast)
        ws_pubsub.on_user_message(_on_user_message)
        ws_pubsub.on_role_message(_on_role_message)
        logger.info("WS pub/sub handlers registered on ConnectionManager")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def connect(
        self,
        user_id: int,
        ws: WebSocket,
        client_host: str = "",
        user_agent: str = "",
        role: str = "",
    ) -> Connection:
        conn = Connection(
            ws=ws,
            user_id=user_id,
            role=role,
            client_host=client_host,
            user_agent=user_agent,
        )
        async with self._lock:
            self._connections.setdefault(user_id, []).append(conn)
        logger.info(
            "WS connect  user_id=%d  role=%s  connections=%d",
            user_id,
            role,
            self._total_count(),
        )
        return conn

    async def disconnect(self, user_id: int, ws: WebSocket):
        async with self._lock:
            conns = self._connections.get(user_id, [])
            self._connections[user_id] = [c for c in conns if c.ws != ws]
            if not self._connections[user_id]:
                del self._connections[user_id]
        logger.info(
            "WS disconnect  user_id=%d  remaining_for_user=%d  total=%d",
            user_id,
            len(self._connections.get(user_id, [])),
            self._total_count(),
        )

    async def disconnect_all(self, user_id: int):
        async with self._lock:
            conns = self._connections.pop(user_id, [])
        closed = 0
        for conn in conns:
            try:
                await conn.ws.close(code=1000)
            except Exception:
                pass
            closed += 1
        if closed:
            logger.info("Disconnected all (%d) for user_id=%d", closed, user_id)

    async def send_event(self, user_id: int, event: BaseEvent):
        payload = event.model_dump_json()
        async with self._lock:
            conns = list(self._connections.get(user_id, []))
        for conn in conns:
            try:
                await conn.ws.send_text(payload)
                conn.touch()
            except Exception:
                await self._remove_stale(conn)
        asyncio.create_task(self._safe_publish(ws_pubsub.publish_user(user_id, event.model_dump())))

    async def send_raw(self, user_id: int, data: str | dict):
        if isinstance(data, dict):
            data = json.dumps(data)
        async with self._lock:
            conns = list(self._connections.get(user_id, []))
        for conn in conns:
            try:
                await conn.ws.send_text(data)
                conn.touch()
            except Exception:
                await self._remove_stale(conn)
        if isinstance(data, str):
            try:
                asyncio.create_task(self._safe_publish(ws_pubsub.publish_user(user_id, {"_raw": data})))
            except Exception:
                pass

    async def broadcast_event(self, event: BaseEvent):
        payload = event.model_dump_json()
        async with self._lock:
            all_conns = [c for cs in self._connections.values() for c in cs]
        for conn in all_conns:
            try:
                await conn.ws.send_text(payload)
                conn.touch()
            except Exception:
                await self._remove_stale(conn)
            asyncio.create_task(self._safe_publish(ws_pubsub.publish_broadcast(event.model_dump())))

    async def broadcast_to_role(self, event: BaseEvent, *roles: str):
        payload = event.model_dump_json()
        async with self._lock:
            all_conns = [c for cs in self._connections.values()
                         for c in cs if c.role in roles]
        for conn in all_conns:
            try:
                await conn.ws.send_text(payload)
                conn.touch()
            except Exception:
                await self._remove_stale(conn)
        for role in roles:
                asyncio.create_task(self._safe_publish(ws_pubsub.publish_role(role, event.model_dump())))

    async def notify_kanban(self, event_data: dict):
        payload = json.dumps({"type": "kanban", "payload": event_data})
        async with self._lock:
            all_conns = [c for cs in self._connections.values() for c in cs]
        for conn in all_conns:
            try:
                await conn.ws.send_text(payload)
                conn.touch()
            except Exception:
                await self._remove_stale(conn)

    async def broadcast_system(self, message: str, level: str = "info", **extra):
        from app.websocket.events import SystemEvent

        event = SystemEvent(message=message, level=level, **extra)
        await self.broadcast_event(event)

    async def notify_task(
        self,
        action: str,
        task_id: int,
        task_title: str,
        assigned_user_id: Optional[int] = None,
        **extra,
    ):
        from app.websocket.events import TaskEvent

        event = TaskEvent(
            action=action,
            task_id=task_id,
            task_title=task_title,
            assigned_user_id=assigned_user_id,
            **extra,
        )
        if assigned_user_id is not None:
            await self.send_event(assigned_user_id, event)
        await self.broadcast_event(event)

    async def notify_approval(
        self,
        action: str,
        approval_id: int,
        task_id: int,
        task_title: str,
        target_user_id: Optional[int] = None,
        **extra,
    ):
        from app.websocket.events import ApprovalEvent

        event = ApprovalEvent(
            action=action,
            approval_id=approval_id,
            task_id=task_id,
            task_title=task_title,
            target_user_id=target_user_id,
            **extra,
        )
        if target_user_id is not None:
            await self.send_event(target_user_id, event)
        await self.broadcast_event(event)

    async def notify_document(
        self,
        action: str,
        document_id: int,
        filename: str,
        uploaded_by: int,
        task_id: Optional[int] = None,
        **extra,
    ):
        from app.websocket.events import DocumentEvent

        event = DocumentEvent(
            action=action,
            document_id=document_id,
            filename=filename,
            uploaded_by=uploaded_by,
            task_id=task_id,
            **extra,
        )
        if task_id is not None:
            async with self._lock:
                conns = list(self._connections.get(uploaded_by, []))
            if conns:
                await self.send_event(uploaded_by, event)
        await self.broadcast_event(event)

    async def send_notification(self, user_id: int, message: str, notification_id: int):
        from app.websocket.events import PersonalNotificationEvent

        event = PersonalNotificationEvent(
            notification_id=notification_id,
            message=message,
            user_id=user_id,
        )
        await self.send_event(user_id, event)

    # ------------------------------------------------------------------
    # Stats / Introspection
    # ------------------------------------------------------------------

    def get_connected_users(self) -> list[int]:
        return list(self._connections.keys())

    def get_connection_count(self) -> int:
        return self._total_count()

    def get_user_connection_count(self, user_id: int) -> int:
        return len(self._connections.get(user_id, []))

    def is_connected(self, user_id: int) -> bool:
        return user_id in self._connections and bool(self._connections[user_id])

    def get_connection_info(self, user_id: int) -> list[dict[str, Any]]:
        conns = self._connections.get(user_id, [])
        return [
            {
                "user_id": c.user_id,
                "role": c.role,
                "connected_at": c.connected_at,
                "age_seconds": c.age_seconds,
                "idle_seconds": c.idle_seconds,
                "client_host": c.client_host,
                "user_agent": c.user_agent,
            }
            for c in conns
        ]

    def get_connections_by_role(self, role: str) -> list[Connection]:
        return [
            c for cs in self._connections.values()
            for c in cs if c.role == role
        ]

    def get_role_summary(self) -> dict[str, int]:
        summary: dict[str, int] = {}
        for cs in self._connections.values():
            for c in cs:
                summary[c.role] = summary.get(c.role, 0) + 1
        return summary

    def _total_count(self) -> int:
        return sum(len(cs) for cs in self._connections.values())

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _remove_stale(self, conn: Connection):
        async with self._lock:
            conns = self._connections.get(conn.user_id, [])
            self._connections[conn.user_id] = [c for c in conns if c.ws != conn.ws]
            if not self._connections[conn.user_id]:
                del self._connections[conn.user_id]

    async def _ping_loop(self):
        while True:
            await asyncio.sleep(PING_INTERVAL)
            async with self._lock:
                all_conns = [c for cs in self._connections.values() for c in cs]
            for conn in all_conns:
                try:
                    pong = await asyncio.wait_for(
                        conn.ws.ping(), timeout=PING_TIMEOUT
                    )
                    conn.touch()
                except asyncio.TimeoutError:
                    logger.warning("Ping timeout user_id=%d", conn.user_id)
                    await self._remove_stale(conn)
                    try:
                        await conn.ws.close(code=1001)
                    except Exception:
                        pass
                except Exception:
                    await self._remove_stale(conn)
                    try:
                        await conn.ws.close(code=1001)
                    except Exception:
                        pass

    @staticmethod
    async def _safe_publish(coro):
        try:
            await coro
        except Exception as exc:
            logger.debug("Pub/sub publish error: %s", exc)

    def start_heartbeat(self):
        self.register_pubsub_handlers()
        asyncio.create_task(self._ping_loop())
        logger.info("Heartbeat started (interval=%ds timeout=%ds)", PING_INTERVAL, PING_TIMEOUT)


manager = ConnectionManager()
