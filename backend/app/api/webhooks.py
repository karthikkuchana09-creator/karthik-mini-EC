from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.services.razorpay_service import RazorpayService
from app.core.background_tasks import task_queue
from app.core.log import get_logger

logger = get_logger("webhook_api")
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """Receive and process Razorpay webhook events with signature verification."""
    payload = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    if not RazorpayService.verify_webhook_signature(payload, signature):
        logger.warning("Webhook signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    import json
    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    event_type = event.get("event", "")
    logger.info("Webhook received: %s — dispatching to background queue", event_type)

    await task_queue.enqueue_billing(
        f"webhook:{event_type}",
        RazorpayService.process_webhook_event_async,
        event,
    )

    return {"status": "queued", "event": event_type}
