from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from app.models.approval import Approval
from app.models.approval_history import ApprovalHistory
from app.models.user import User, UserRole
from app.schemas.approval import ApprovalCreate, ApprovalAction
from app.core.log import get_logger
from app.core.cache import cache_delete_pattern
from app.services.audit_log_service import log_action
from app.services.notification_service import (
    create_approval_request_notification,
    create_approval_action_notification,
)
from app.utils.pagination import paginate_query

logger = get_logger("approval_service")


def _invalidate_approval_caches():
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(cache_delete_pattern("dashboard:*"))
    finally:
        loop.close()


def create_approval(db: Session, approval_data: ApprovalCreate, current_user):
    logger.info("Creating approval: title=%s by user_id=%d", approval_data.title, current_user.id)

    approval = Approval(
        title=approval_data.title,
        description=approval_data.description,
        requested_by=current_user.id
    )

    db.add(approval)
    db.commit()
    db.refresh(approval)

    log_action(
        db, current_user.id, "create", "approval", approval.id,
        new_value={"title": approval_data.title, "description": approval_data.description},
    )

    approvers = db.query(User).filter(
        User.role.in_([UserRole.manager, UserRole.admin]),
        User.is_active == True,
    ).all()
    for approver in approvers:
        create_approval_request_notification(
            db, approver.id, approval.id, approval.title,
        )

    logger.info("Approval id=%d created successfully", approval.id)
    _invalidate_approval_caches()
    return approval


def get_approvals(
    db: Session,
    current_user,
    page: int = 1,
    size: int = 20,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
    search: Optional[str] = None,
):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    logger.debug("Fetching approvals for user_id=%d role=%s", current_user.id, role)

    query = db.query(Approval).options(joinedload(Approval.requester))

    if role == "admin":
        pass
    elif role == "manager":
        query = query.filter(Approval.current_level == "manager")
    else:
        query = query.filter(Approval.requested_by == current_user.id)

    result = paginate_query(
        db, query,
        page=page, size=size,
        sort_by=sort_by, sort_order=sort_order,
        search=search, search_columns=[Approval.title, Approval.description],
    )

    enriched = []
    for a in result["items"]:
        requester = a.requester
        enriched.append({
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "requested_by": {
                "id": requester.id,
                "name": requester.name,
                "email": requester.email,
            } if requester else None,
            "status": a.status,
            "current_level": a.current_level,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        })

    result["items"] = enriched
    logger.debug("Fetched %d approvals for user_id=%d", len(enriched), current_user.id)
    return result


def take_approval_action(db: Session, approval_id: int, action_data: ApprovalAction, current_user):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    logger.info("Approval action: id=%d action=%s by user_id=%d role=%s",
                approval_id, action_data.action, current_user.id, role)

    approval = db.query(Approval).filter(Approval.id == approval_id).first()

    if not approval:
        logger.warning("Approval action failed: not found id=%d", approval_id)
        raise HTTPException(404, "Approval not found")

    if role == "employee":
        logger.warning("Employee user_id=%d not allowed to take approval action", current_user.id)
        raise HTTPException(403, "Not allowed")

    current_level = approval.current_level
    if current_level == "manager" and role != "manager":
        logger.warning("Manager approval required for id=%d", approval_id)
        raise HTTPException(403, "Manager approval required")

    if current_level == "admin" and role != "admin":
        logger.warning("Admin approval required for id=%d", approval_id)
        raise HTTPException(403, "Admin approval required")

    if action_data.action == "rejected" and not action_data.comment:
        logger.warning("Rejection comment required for approval id=%d", approval_id)
        raise HTTPException(400, "Comment required for rejection")

    old_status = approval.status
    old_level = approval.current_level

    if action_data.action == "approved":
        if current_level == "manager":
            approval.current_level = "admin"
            approval.status = "pending"
            logger.info("Approval id=%d moved to admin level", approval_id)
        else:
            approval.status = "approved"
            logger.info("Approval id=%d approved", approval_id)

    elif action_data.action == "rejected":
        approval.status = "rejected"
        logger.info("Approval id=%d rejected", approval_id)

    elif action_data.action == "hold":
        approval.status = "on_hold"
        logger.info("Approval id=%d placed on hold", approval_id)

    else:
        logger.warning("Invalid approval action: %s for id=%d", action_data.action, approval_id)
        raise HTTPException(400, "Invalid action")

    history = ApprovalHistory(
        approval_id=approval.id,
        action_by=current_user.id,
        action=action_data.action,
        comment=action_data.comment
    )

    db.add(history)
    db.commit()

    log_action(
        db, current_user.id, action_data.action, "approval", approval_id,
        old_value={"status": old_status, "current_level": old_level},
        new_value={"status": approval.status, "current_level": approval.current_level, "action": action_data.action, "comment": action_data.comment},
    )
    create_approval_action_notification(
        db, approval.requested_by, approval_id, 0, approval.title, action_data.action,
    )
    logger.info("Approval action %s completed for id=%d", action_data.action, approval_id)
    _invalidate_approval_caches()
    return {"message": "Action completed"}


def get_approval_history(db: Session, approval_id: int):
    logger.debug("Fetching approval history for id=%d", approval_id)
    history = db.query(ApprovalHistory).filter(
        ApprovalHistory.approval_id == approval_id
    ).all()
    logger.debug("Fetched %d history entries for approval id=%d", len(history), approval_id)
    return history
