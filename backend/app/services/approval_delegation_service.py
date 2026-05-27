from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import Session, joinedload
from fastapi_pagination.ext.sqlalchemy import paginate

from app.models.approval_delegation import ApprovalDelegation
from app.models.user import User
from app.schemas.approval_delegation import ApprovalDelegationCreate, ApprovalDelegationCancel, ApprovalDelegationFilter
from app.core.pagination import QueryBuilder
from app.core.log import get_logger

logger = get_logger("approval_delegation_service")


def _deactivate_expired(db: Session):
    now = datetime.utcnow()
    expired = db.scalars(
        select(ApprovalDelegation).where(
            and_(
                ApprovalDelegation.is_active.is_(True),
                ApprovalDelegation.end_date < now,
            )
        )
    ).all()
    for d in expired:
        d.is_active = False
        logger.info("Auto-deactivated expired delegation id=%d", d.id)
    if expired:
        db.commit()


def create_delegation(
    db: Session, data: ApprovalDelegationCreate, current_user
) -> ApprovalDelegation:
    logger.info(
        "Creating delegation: delegator_id=%d delegatee_id=%d",
        current_user.id, data.delegatee_id,
    )

    if data.delegatee_id == current_user.id:
        raise HTTPException(400, "Cannot delegate approval to yourself")

    delegatee = db.scalar(
        select(User).where(
            User.id == data.delegatee_id,
            User.is_active.is_(True),
        )
    )
    if not delegatee:
        raise HTTPException(404, "Delegatee user not found or inactive")

    delegation = ApprovalDelegation(
        delegator_id=current_user.id,
        delegatee_id=data.delegatee_id,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        is_active=True,
    )

    db.add(delegation)
    db.commit()
    db.refresh(delegation)

    logger.info("Delegation created id=%d", delegation.id)
    return delegation


def list_delegations_filtered(
    db: Session,
    filters: ApprovalDelegationFilter,
    user_id: Optional[int] = None,
):
    _deactivate_expired(db)

    query = (
        select(ApprovalDelegation)
        .options(
            joinedload(ApprovalDelegation.delegator),
            joinedload(ApprovalDelegation.delegatee),
        )
    )

    if user_id is not None:
        query = query.where(
            or_(
                ApprovalDelegation.delegator_id == user_id,
                ApprovalDelegation.delegatee_id == user_id,
            )
        )

    return (
        QueryBuilder(db, ApprovalDelegation, query)
        .search(filters.q, [ApprovalDelegation.reason])
        .filter_exact(
            delegator_id=filters.delegator_id,
            delegatee_id=filters.delegatee_id,
            is_active=filters.is_active,
        )
        .sort(filters.sort_by, filters.sort_order, [
            "start_date", "end_date", "created_at", "is_active",
        ])
        .paginate(filters.page, filters.size)
    )


def cancel_delegation(
    db: Session, delegation_id: int, body: Optional[ApprovalDelegationCancel] = None, current_user=None
) -> ApprovalDelegation:
    logger.info("Cancelling delegation id=%d", delegation_id)

    delegation = db.scalar(
        select(ApprovalDelegation).where(ApprovalDelegation.id == delegation_id)
    )
    if not delegation:
        raise HTTPException(404, "Delegation not found")

    if not delegation.is_active:
        raise HTTPException(400, "Delegation is already inactive")

    if current_user and delegation.delegator_id != current_user.id:
        raise HTTPException(403, "Only the delegator can cancel this delegation")

    delegation.is_active = False
    if body and body.reason:
        delegation.reason = (
            (delegation.reason or "") + "\n---\nCancellation: " + body.reason
        )

    db.commit()
    db.refresh(delegation)

    logger.info("Delegation id=%d cancelled", delegation_id)
    return delegation
