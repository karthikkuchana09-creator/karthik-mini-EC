from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.tenant import get_current_tenant_id, require_active_tenant
from app.models.user import User
from app.schemas.payment import (
    CreateOrderRequest, CreateOrderResponse,
    VerifyPaymentRequest, VerifyPaymentResponse,
    CreateSubscriptionRequest, CreateSubscriptionResponse,
    PaymentHistoryResponse, PaymentHistoryItem,
    InvoiceListResponse, InvoiceItem,
)
from app.services.razorpay_service import RazorpayService, PAYMENT_AMOUNTS, CREDIT_PRICES
from app.services.subscription_service import SubscriptionService
from app.core.log import get_logger

logger = get_logger("payment_api")
router = APIRouter(prefix="/payments", tags=["Payments"])


def _get_org_id(request: Request, user: User) -> int:
    return user.tenant_id or get_current_tenant_id(request) or require_active_tenant(request)


@router.post("/create-order", response_model=CreateOrderResponse)
def create_order(
    body: CreateOrderRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a Razorpay order for plan purchase or credit top-up."""
    org_id = _get_org_id(request, user)
    result = RazorpayService.create_order(
        db=db,
        org_id=org_id,
        user_id=user.id,
        amount_inr=body.amount,
        payment_type=body.payment_type,
        plan_tier=body.plan_tier,
        billing_interval=body.billing_interval,
        credit_amount=body.credit_amount,
    )
    return result


@router.post("/verify", response_model=VerifyPaymentResponse)
def verify_payment(
    body: VerifyPaymentRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Verify Razorpay payment signature and process the purchase."""
    result = RazorpayService.verify_payment(
        db=db,
        order_id=body.razorpay_order_id,
        payment_id=body.razorpay_payment_id,
        signature=body.razorpay_signature,
    )
    return result


@router.post("/create-subscription", response_model=CreateSubscriptionResponse)
def create_subscription(
    body: CreateSubscriptionRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a recurring subscription link for plan billing."""
    org_id = _get_org_id(request, user)
    result = RazorpayService.create_subscription_link(
        db=db,
        org_id=org_id,
        user_id=user.id,
        plan_tier=body.plan_tier,
        billing_interval=body.billing_interval,
    )
    return result


@router.get("/history", response_model=PaymentHistoryResponse)
def get_payment_history(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Get payment history for the organization."""
    org_id = _get_org_id(request, user)
    skip = (page - 1) * size
    return RazorpayService.get_payment_history(db, org_id, skip=skip, limit=size)


@router.get("/invoices", response_model=InvoiceListResponse)
def get_invoices(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Get invoice history for the organization."""
    org_id = _get_org_id(request, user)
    skip = (page - 1) * size
    return RazorpayService.get_invoices(db, org_id, skip=skip, limit=size)


@router.get("/pricing")
def get_pricing():
    """Get plan pricing and credit pack prices."""
    return {
        "plans": PAYMENT_AMOUNTS,
        "credit_packs": {str(k): v for k, v in CREDIT_PRICES.items()},
        "currency": "INR",
    }


@router.get("/plans")
def get_plans_with_pricing(
    db: Session = Depends(get_db),
):
    """List plans with pricing used for Razorpay checkout."""
    plans = SubscriptionService.list_plans(db)
    return [
        {
            "tier": plan.tier.value if hasattr(plan.tier, "value") else plan.tier,
            "name": plan.name,
            "description": plan.description,
            "price_monthly": PAYMENT_AMOUNTS.get(plan.tier.value if hasattr(plan.tier, "value") else plan.tier, {}).get("monthly", plan.price_monthly * 100),
            "price_yearly": PAYMENT_AMOUNTS.get(plan.tier.value if hasattr(plan.tier, "value") else plan.tier, {}).get("yearly", plan.price_yearly * 100),
            "max_users": plan.max_users,
            "max_tasks": plan.max_tasks,
            "max_ai_queries": plan.max_ai_queries,
            "features": {
                "analytics": plan.has_analytics,
                "approvals": plan.has_approvals,
                "ai_intelligence": plan.has_ai_intelligence,
                "realtime_collaboration": plan.has_realtime_collaboration,
                "advanced_analytics": plan.has_advanced_analytics,
                "api_access": plan.has_api_access,
                "audit_trail": plan.has_audit_trail,
            },
        }
        for plan in plans
    ]
