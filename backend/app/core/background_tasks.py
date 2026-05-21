from __future__ import annotations
import asyncio
import time
from enum import Enum
from dataclasses import dataclass, field
from typing import Any, Callable, Coroutine, Optional
from datetime import datetime
from app.core.config import settings
from app.core.log import get_logger

logger = get_logger("background_tasks")


class TaskPriority(Enum):
    LOW = 0
    MEDIUM = 1
    HIGH = 2
    CRITICAL = 3


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


@dataclass
class BackgroundTask:
    name: str
    coro: Callable[..., Coroutine]
    args: tuple = ()
    kwargs: dict = field(default_factory=dict)
    priority: TaskPriority = TaskPriority.MEDIUM
    max_retries: int = 3
    retry_delay: float = 5.0
    timeout: Optional[float] = None
    created_at: float = field(default_factory=time.time)
    status: TaskStatus = TaskStatus.PENDING
    attempts: int = 0
    last_error: Optional[str] = None

    @property
    def age_seconds(self) -> float:
        return time.time() - self.created_at


class BackgroundTaskQueue:
    def __init__(self, max_workers: int = 4):
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._workers: list[asyncio.Task] = []
        self._max_workers = max_workers
        self._running = False
        self._shutdown_event = asyncio.Event()

    def start(self):
        if self._running:
            return
        self._running = True
        self._shutdown_event.clear()
        for i in range(self._max_workers):
            worker = asyncio.create_task(self._worker_loop(i))
            self._workers.append(worker)
        logger.info("Background task queue started (%d workers)", self._max_workers)

    async def stop(self, wait: bool = True):
        self._running = False
        self._shutdown_event.set()
        for worker in self._workers:
            worker.cancel()
        if wait and self._workers:
            await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
        logger.info("Background task queue stopped")

    async def enqueue(self, task: BackgroundTask):
        # Priority queue uses (priority.value, timestamp) as sort key
        await self._queue.put((task.priority.value, task.created_at, task))
        logger.debug("Enqueued task: %s (priority=%s)", task.name, task.priority.name)

    async def enqueue_billing(
        self, name: str, coro: Callable, *args,
        max_retries: int = 3, priority: TaskPriority = TaskPriority.HIGH,
        **kwargs,
    ):
        task = BackgroundTask(
            name=name, coro=coro, args=args, kwargs=kwargs,
            priority=priority, max_retries=max_retries,
            retry_delay=10.0, timeout=120.0,
        )
        await self.enqueue(task)

    async def enqueue_webhook_retry(
        self, name: str, coro: Callable, *args,
        max_retries: int = 5, **kwargs,
    ):
        task = BackgroundTask(
            name=name, coro=coro, args=args, kwargs=kwargs,
            priority=TaskPriority.HIGH, max_retries=max_retries,
            retry_delay=30.0, timeout=30.0,
        )
        await self.enqueue(task)

    async def _worker_loop(self, worker_id: int):
        logger.debug("Worker %d started", worker_id)
        while self._running:
            try:
                _, _, task = await asyncio.wait_for(
                    self._queue.get(), timeout=1.0,
                )
            except asyncio.TimeoutError:
                continue
            except Exception as exc:
                logger.error("Worker %d queue error: %s", worker_id, exc)
                continue

            task.status = TaskStatus.RUNNING
            task.attempts += 1
            logger.info("Worker %d executing: %s (attempt %d/%d)",
                        worker_id, task.name, task.attempts, task.max_retries)

            try:
                coro_result = task.coro(*task.args, **task.kwargs)
                if task.timeout:
                    await asyncio.wait_for(coro_result, timeout=task.timeout)
                else:
                    await coro_result
                task.status = TaskStatus.COMPLETED
                logger.info("Worker %d completed: %s", worker_id, task.name)
            except asyncio.CancelledError:
                task.status = TaskStatus.FAILED
                task.last_error = "Cancelled"
                raise
            except Exception as exc:
                task.last_error = str(exc)
                if task.attempts < task.max_retries:
                    task.status = TaskStatus.RETRYING
                    retry_delay = min(
                        task.retry_delay * (2 ** (task.attempts - 1)),
                        300.0,
                    )
                    logger.warning("Worker %d retrying %s in %.1fs (attempt %d/%d): %s",
                                   worker_id, task.name, retry_delay,
                                   task.attempts, task.max_retries, exc)
                    await asyncio.sleep(retry_delay)
                    await self._queue.put((task.priority.value, time.time(), task))
                else:
                    task.status = TaskStatus.FAILED
                    logger.error("Worker %d failed: %s after %d attempts: %s",
                                 worker_id, task.name, task.max_retries, exc)
            finally:
                self._queue.task_done()

    @property
    def pending_count(self) -> int:
        return self._queue.qsize()

    @property
    def is_running(self) -> bool:
        return self._running


task_queue = BackgroundTaskQueue(max_workers=settings.BACKGROUND_TASK_MAX_WORKERS)
