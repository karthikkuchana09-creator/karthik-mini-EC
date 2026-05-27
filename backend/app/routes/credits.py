from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from fastapi_pagination import Page
from app.routes.deps import get_db, get_current_user
from app.core.tenant import get_current_tenant_id, require_active_tenant
from app.models.user import User
from app.schemas.credit import CreditTransactionOut
from app.repository.credit_repository import list_credit_transactions
from app.services.credit_service import CreditService, CREDIT_COSTS, PLAN_CREDIT_ALLOCATIONS
from app.core.log import get_logger

logger = get_logger("credit_api")
router = APIRouter(prefix="/credits", tags=["Credits"])


def _get_org_id(request: Request, user: User) -> int:
    return user.tenant_id or get_current_tenant_id(request) or require_active_tenant(request)


@router.get("/balance")
def get_credit_balance(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    summary = CreditService.get_credit_summary(db, org_id)
    return summary


@router.get("/transactions", response_model=Page[CreditTransactionOut])
def get_credit_transactions(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    feature: str = Query(None),
):
    org_id = _get_org_id(request, user)
    return list_credit_transactions(db, org_id, feature=feature)


@router.post("/purchase")
def purchase_credits(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    credits: int = Query(..., ge=1, description="Number of credits to purchase"),
):
    org_id = _get_org_id(request, user)
    transaction = CreditService.add_credits(
        db=db,
        org_id=org_id,
        credits=credits,
        transaction_type="purchase",
        description=f"Purchased {credits} credits",
        user_id=user.id,
    )
    account = CreditService.get_balance(db, org_id)
    return {
        "message": f"Successfully purchased {credits} credits",
        "credits_purchased": credits,
        "total_credits": account.total_credits,
        "remaining_credits": account.remaining_credits,
        "transaction_id": transaction.id,
    }


@router.post("/reset")
def reset_credits(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    account = CreditService.reset_monthly_credits(db, org_id)
    return {
        "message": "Credits reset to plan allocation",
        "total_credits": account.total_credits,
        "remaining_credits": account.remaining_credits,
    }


@router.get("/costs")
def list_credit_costs():
    return {
        "costs": CREDIT_COSTS,
        "plan_allocations": PLAN_CREDIT_ALLOCATIONS,
    }


@router.get("/low-credit-check")
def low_credit_check(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org_id = _get_org_id(request, user)
    account = CreditService.get_balance(db, org_id)
    return {
        "is_low": account.is_low,
        "is_exhausted": account.is_exhausted,
        "remaining_credits": account.remaining_credits,
        "usage_pct": account.usage_pct,
        "threshold": account.low_credit_threshold,
    }
