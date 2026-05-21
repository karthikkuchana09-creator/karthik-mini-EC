from __future__ import annotations
import asyncio
from typing import Optional
from app.core.config import settings
from app.core.log import get_logger

logger = get_logger("enterprise_scheduler")


class EnterpriseScheduler:
    """Periodic background scheduler for enterprise maintenance tasks."""

    def __init__(self):
        self._tasks: dict[str, asyncio.Task] = {}
        self._running = False

    async def start(self):
        if self._running:
            return
        self._running = True
        self._tasks["webhook_retry"] = asyncio.create_task(
            self._run_periodic("webhook_retry", settings.SCHEDULER_WEBHOOK_RETRY_INTERVAL, self._process_webhook_retries)
        )
        self._tasks["subscription_health"] = asyncio.create_task(
            self._run_periodic("subscription_health", settings.SCHEDULER_SUBSCRIPTION_INTERVAL, self._check_subscriptions)
        )
        self._tasks["usage_aggregation"] = asyncio.create_task(
            self._run_periodic("usage_aggregation", settings.SCHEDULER_USAGE_AGGREGATION_INTERVAL, self._aggregate_usage)
        )
        self._tasks["invoice_generation"] = asyncio.create_task(
            self._run_periodic("invoice_generation", settings.SCHEDULER_INVOICE_INTERVAL, self._generate_invoices)
        )
        self._tasks["maintenance"] = asyncio.create_task(
            self._run_periodic("maintenance", settings.SCHEDULER_MAINTENANCE_INTERVAL, self._run_maintenance)
        )
        logger.info("Enterprise scheduler started with %d tasks", len(self._tasks))

    async def stop(self):
        self._running = False
        for name, task in self._tasks.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        self._tasks.clear()
        logger.info("Enterprise scheduler stopped")

    async def _run_periodic(self, name: str, interval: int, coro):
        while self._running:
            try:
                await coro()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Scheduler task %s error: %s", name, exc)
            await asyncio.sleep(interval)

    async def _process_webhook_retries(self):
        from app.services.webhook_retry_service import WebhookRetryService
        await WebhookRetryService.process_pending_retries()

    async def _check_subscriptions(self):
        from app.services.subscription_scheduler import SubscriptionScheduler
        await SubscriptionScheduler.run_all()

    async def _aggregate_usage(self):
        from app.services.usage_aggregator import UsageAggregator
        await UsageAggregator.aggregate_all()

    async def _generate_invoices(self):
        from app.services.subscription_scheduler import BillingProcessor
        await BillingProcessor.run_all()

    async def _run_maintenance(self):
        logger.info("Running maintenance tasks...")
        try:
            await self._aggregate_usage()
        except Exception as exc:
            logger.error("Maintenance aggregation error: %s", exc)
        logger.info("Maintenance complete")


enterprise_scheduler = EnterpriseScheduler()
