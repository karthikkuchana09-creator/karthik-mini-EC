from typing import Optional, Callable
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.tenant import get_current_tenant_id
from app.models.user import User
from app.services.credit_service import CreditService, CREDIT_COSTS


class require_credits:
    def __init__(self, feature: str):
        self.feature = feature

    async def __call__(
        self,
        request: Request,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        org_id = user.tenant_id or get_current_tenant_id(request)
        if not org_id:
            return True
        has = CreditService.check_credits(db, org_id, self.feature)
        if not has:
            account = CreditService.get_balance(db, org_id)
            cost = CREDIT_COSTS.get(self.feature, 0)
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"Insufficient credits for '{self.feature}'. "
                    f"Required: {cost}, Available: {account.remaining_credits}. "
                    f"Purchase more credits or upgrade your plan."
                ),
                headers={
                    "X-Credits-Required": str(cost),
                    "X-Credits-Available": str(account.remaining_credits),
                },
            )
        return True


def deduct_feature_credits(
    db: Session,
    user: User,
    feature: str,
    request: Optional[Request] = None,
    reference_id: Optional[int] = None,
):
    org_id = user.tenant_id
    if not org_id and request:
        org_id = get_current_tenant_id(request)
    if not org_id:
        return
    CreditService.deduct(
        db=db,
        org_id=org_id,
        feature=feature,
        user_id=user.id,
        reference_id=reference_id,
    )


def get_credit_cost(feature: str) -> Optional[int]:
    return CREDIT_COSTS.get(feature)
