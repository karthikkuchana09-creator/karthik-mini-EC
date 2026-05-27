from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, and_
from sqlalchemy.orm import Session, joinedload
from fastapi_pagination.ext.sqlalchemy import paginate

from app.models.approval import Approval
from app.models.approval_escalation import ApprovalEscalation
from app.models.user import User
from app.schemas.approval_escalation import ApprovalEscalationCreate, ApprovalEscalationResolve, ApprovalEscalationFilter
from app.core.pagination import QueryBuilder
from app.core.log import get_logger
from app.services.audit_log_service import log_action

logger = get_logger("approval_escalation_service")


def create_escalation(
    db: Session, data: ApprovalEscalationCreate, current_user
) -> ApprovalEscalation:
    logger.info(
        "Creating escalation: approval_id=%d escalated_to=%d level=%s by user_id=%d",
        data.approval_id, data.escalated_to, data.escalation_level, current_user.id,
    )

    approval = db.scalar(select(Approval).where(Approval.id == data.approval_id))
    if not approval:
        raise HTTPException(404, "Approval not found")

    escalated_to_user = db.scalar(
        select(User).where(User.id == data.escalated_to, User.is_active.is_(True))
    )
    if not escalated_to_user:
        raise HTTPException(404, "Target user not found or inactive")

    existing_active = db.scalar(
        select(ApprovalEscalation).where(
            and_(
                ApprovalEscalation.approval_id == data.approval_id,
                ApprovalEscalation.status == "active",
            )
        )
    )
    if existing_active:
        raise HTTPException(409, "An active escalation already exists for this approval")

    escalation = ApprovalEscalation(
        approval_id=data.approval_id,
        escalated_from=current_user.id,
        escalated_to=data.escalated_to,
        reason=data.reason,
        escalation_level=data.escalation_level,
        status="active",
    )

    approval.is_escalated = True

    db.add(escalation)
    db.commit()
    db.refresh(escalation)

    log_action(
        db, current_user.id, "escalate", "approval", data.approval_id,
        new_value={"escalation_id": escalation.id, "escalated_to": data.escalated_to, "level": data.escalation_level},
        module_name="escalation", action_type="escalate", record_id=escalation.id,
    )

    logger.info(
        "Escalation created id=%d for approval_id=%d", escalation.id, data.approval_id
    )
    return escalation


def list_escalations_filtered(db: Session, filters: ApprovalEscalationFilter):
    query = (
        select(ApprovalEscalation)
        .options(
            joinedload(ApprovalEscalation.approval),
            joinedload(ApprovalEscalation.escalated_by_user),
            joinedload(ApprovalEscalation.escalated_to_user),
        )
    )
    return (
        QueryBuilder(db, ApprovalEscalation, query)
        .search(filters.q, [ApprovalEscalation.reason, ApprovalEscalation.escalation_level])
        .filter_exact(
            approval_id=filters.approval_id,
            status=filters.status,
            escalation_level=filters.escalation_level,
            escalated_from=filters.escalated_from,
            escalated_to=filters.escalated_to,
        )
        .sort(filters.sort_by, filters.sort_order, [
            "escalated_at", "resolved_at", "status",
            "escalation_level", "approval_id",
        ])
        .paginate(filters.page, filters.size)
    )


def resolve_escalation(
    db: Session, escalation_id: int,
    body: Optional[ApprovalEscalationResolve] = None,
    current_user=None,
) -> ApprovalEscalation:
    logger.info("Resolving escalation id=%d", escalation_id)

    escalation = db.scalar(
        select(ApprovalEscalation).where(ApprovalEscalation.id == escalation_id)
    )
    if not escalation:
        raise HTTPException(404, "Escalation not found")

    if escalation.status != "active":
        raise HTTPException(400, f"Escalation is already {escalation.status}")

    if current_user:
        role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
        is_admin = role in ("admin", "super_admin")
        if not is_admin and escalation.escalated_to != current_user.id:
            raise HTTPException(403, "Only the escalation target or an admin can resolve this escalation")

    escalation.status = "resolved"
    escalation.resolved_at = datetime.utcnow()

    approval = db.scalar(select(Approval).where(Approval.id == escalation.approval_id))
    if approval:
        has_other_active = db.scalar(
            select(ApprovalEscalation).where(
                and_(
                    ApprovalEscalation.approval_id == escalation.approval_id,
                    ApprovalEscalation.status == "active",
                    ApprovalEscalation.id != escalation.id,
                )
            )
        )
        if not has_other_active:
            approval.is_escalated = False

    if body and body.resolution_note:
        escalation.reason = (
            (escalation.reason + "\n---\nResolution: " + body.resolution_note)
            if escalation.reason
            else ("Resolution: " + body.resolution_note)
        )

    db.commit()
    db.refresh(escalation)

    log_action(
        db, escalation.escalated_from, "resolve", "approval", escalation.approval_id,
        new_value={"escalation_id": escalation.id, "status": "resolved"},
        module_name="escalation", action_type="resolve", record_id=escalation.id,
    )

    logger.info("Escalation id=%d resolved successfully", escalation_id)
    return escalation


def cancel_escalation(db: Session, escalation_id: int, current_user) -> ApprovalEscalation:
    logger.info("Cancelling escalation id=%d by user_id=%d", escalation_id, current_user.id)

    escalation = db.scalar(
        select(ApprovalEscalation).where(ApprovalEscalation.id == escalation_id)
    )
    if not escalation:
        raise HTTPException(404, "Escalation not found")

    if escalation.status != "active":
        raise HTTPException(400, f"Escalation is already {escalation.status}")

    if current_user:
        role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
        is_admin = role in ("admin", "super_admin")
        if not is_admin and escalation.escalated_from != current_user.id:
            raise HTTPException(403, "Only the escalation creator or an admin can cancel this escalation")

    escalation.status = "cancelled"

    approval = db.scalar(select(Approval).where(Approval.id == escalation.approval_id))
    if approval:
        has_other_active = db.scalar(
            select(ApprovalEscalation).where(
                and_(
                    ApprovalEscalation.approval_id == escalation.approval_id,
                    ApprovalEscalation.status == "active",
                    ApprovalEscalation.id != escalation.id,
                )
            )
        )
        if not has_other_active:
            approval.is_escalated = False

    db.commit()
    db.refresh(escalation)

    log_action(
        db, current_user.id, "cancel", "approval", escalation.approval_id,
        new_value={"escalation_id": escalation.id, "status": "cancelled"},
        module_name="escalation", action_type="cancel", record_id=escalation.id,
    )

    logger.info("Escalation id=%d cancelled successfully", escalation_id)
    return escalation
