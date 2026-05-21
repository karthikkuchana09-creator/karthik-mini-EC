from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.core.background_tasks import task_queue
from app.core.redis_client import get_redis
from app.services.tenant_monitor import TenantMonitor
from app.services.webhook_retry_service import WebhookRetryService
from app.services.subscription_scheduler import SubscriptionScheduler
from app.services.usage_aggregator import UsageAggregator
from app.websocket.manager import manager
from app.core.log import get_logger
from fastapi import HTTPException, status

logger = get_logger("monitoring_api")
router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "karthik-ec"}


@router.get("/health/detailed")
async def detailed_health():
    checks = {}
    checks["background_queue"] = {
        "running": task_queue.is_running,
        "pending": task_queue.pending_count,
    }
    redis_client = await get_redis()
    checks["redis"] = {"available": redis_client is not None}
    checks["websocket"] = {
        "connections": manager.get_connection_count(),
        "connected_users": len(manager.get_connected_users()),
    }
    return {"status": "healthy", "checks": checks}


@router.get("/background-queue")
def get_queue_status(user: User = Depends(get_current_user)):
    _require_admin(user)
    return {
        "running": task_queue.is_running,
        "pending_count": task_queue.pending_count,
        "worker_count": task_queue._max_workers,
    }


@router.get("/webhook-retries")
def get_webhook_retries(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    return WebhookRetryService.get_stats(db)


@router.get("/tenant-performance")
def get_tenant_performance(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    return TenantMonitor.get_all_orgs_summary(db, hours)


@router.post("/scheduler/trigger/usage-aggregation")
async def trigger_usage_aggregation(
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    await UsageAggregator.aggregate_all()
    return {"message": "Usage aggregation triggered"}


@router.post("/scheduler/trigger/subscription-checks")
async def trigger_subscription_checks(
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    await SubscriptionScheduler.run_all()
    return {"message": "Subscription checks triggered"}


@router.post("/scheduler/trigger/webhook-retries")
async def trigger_webhook_retries(
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    from app.services.webhook_retry_service import WebhookRetryService
    await WebhookRetryService.process_pending_retries()
    return {"message": "Webhook retry processing triggered"}
