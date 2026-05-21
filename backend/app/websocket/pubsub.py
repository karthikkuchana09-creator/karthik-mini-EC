from __future__ import annotations
import json
import asyncio
from typing import Optional, Callable, Coroutine, Any
from app.core.redis_client import get_redis
from app.core.log import get_logger

logger = get_logger("ws_pubsub")

WS_CHANNEL_BROADCAST = "ws:broadcast"
WS_CHANNEL_USER = "ws:user:"
WS_CHANNEL_ROLE = "ws:role:"


class WSPubSub:
    """Redis pub/sub bridge for cross-process WebSocket message delivery."""

    def __init__(self):
        self._listener_task: Optional[asyncio.Task] = None
        self._message_handlers: dict[str, list[Callable]] = {
            "broadcast": [],
            "user": [],
            "role": [],
        }

    def on_broadcast(self, handler: Callable[[dict], Coroutine]):
        self._message_handlers["broadcast"].append(handler)

    def on_user_message(self, handler: Callable[[int, dict], Coroutine]):
        self._message_handlers["user"].append(handler)

    def on_role_message(self, handler: Callable[[str, dict], Coroutine]):
        self._message_handlers["role"].append(handler)

    async def publish_broadcast(self, message: dict):
        r = await get_redis()
        if r is None:
            return
        payload = json.dumps({"type": "broadcast", "data": message})
        await r.publish(WS_CHANNEL_BROADCAST, payload)

    async def publish_user(self, user_id: int, message: dict):
        r = await get_redis()
        if r is None:
            return
        payload = json.dumps({"type": "user", "user_id": user_id, "data": message})
        await r.publish(f"{WS_CHANNEL_USER}{user_id}", payload)

    async def publish_role(self, role: str, message: dict):
        r = await get_redis()
        if r is None:
            return
        payload = json.dumps({"type": "role", "role": role, "data": message})
        await r.publish(f"{WS_CHANNEL_ROLE}{role}", payload)

    async def start_listener(self):
        r = await get_redis()
        if r is None:
            logger.warning("Redis unavailable, WS pub/sub disabled")
            return

        pubsub = r.pubsub()
        await pubsub.subscribe(WS_CHANNEL_BROADCAST)
        await pubsub.psubscribe(f"{WS_CHANNEL_USER}*", f"{WS_CHANNEL_ROLE}*")

        self._listener_task = asyncio.create_task(self._listen_loop(pubsub))
        logger.info("WS pub/sub listener started (subscribe + psubscribe)")

    async def _listen_loop(self, pubsub):
        try:
            async for msg in pubsub.listen():
                if msg["type"] not in ("message", "pmessage"):
                    continue
                try:
                    data = json.loads(msg["data"])
                    msg_type = data.get("type")

                    if msg_type == "broadcast":
                        for handler in self._message_handlers["broadcast"]:
                            asyncio.create_task(handler(data["data"]))

                    elif msg_type == "user":
                        user_id = data.get("user_id")
                        for handler in self._message_handlers["user"]:
                            asyncio.create_task(handler(user_id, data["data"]))

                    elif msg_type == "role":
                        role = data.get("role")
                        for handler in self._message_handlers["role"]:
                            asyncio.create_task(handler(role, data["data"]))
                except Exception as exc:
                    logger.debug("WS pub/sub msg error: %s", exc)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("WS pub/sub listener error: %s", exc)
        finally:
            try:
                await pubsub.unsubscribe()
                await pubsub.punsubscribe()
            except Exception:
                pass

    async def stop_listener(self):
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            self._listener_task = None
        logger.info("WS pub/sub listener stopped")


ws_pubsub = WSPubSub()
