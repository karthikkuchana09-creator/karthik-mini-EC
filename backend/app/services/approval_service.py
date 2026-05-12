from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.approval import Approval
from app.models.approval_history import ApprovalHistory
from app.models.user import User
from app.schemas.approval import ApprovalCreate, ApprovalAction
from app.core.log import get_logger
from app.services.audit_log_service import log_action
from app.services.notification_service import create_notification

logger = get_logger("approval_service")


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

    log_action(db, current_user.id, "create", "approval", approval.id)
    logger.info("Approval id=%d created successfully", approval.id)
    return approval


def get_approvals(db: Session, current_user):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    logger.debug("Fetching approvals for user_id=%d role=%s", current_user.id, role)

    if role == "admin":
        approvals = db.query(Approval).all()
    elif role == "manager":
        approvals = db.query(Approval).filter(
            Approval.current_level == "manager"
        ).all()
    else:
        approvals = db.query(Approval).filter(
            Approval.requested_by == current_user.id
        ).all()

    result = []
    for a in approvals:
        requester = db.query(User).filter(User.id == a.requested_by).first()
        result.append({
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

    logger.debug("Fetched %d approvals for user_id=%d", len(result), current_user.id)
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

    log_action(db, current_user.id, action_data.action, "approval", approval_id)
    create_notification(
        db, approval.requested_by,
        f"Approval #{approval_id} was {action_data.action}"
    )
    logger.info("Approval action %s completed for id=%d", action_data.action, approval_id)
    return {"message": "Action completed"}


def get_approval_history(db: Session, approval_id: int):
    logger.debug("Fetching approval history for id=%d", approval_id)
    history = db.query(ApprovalHistory).filter(
        ApprovalHistory.approval_id == approval_id
    ).all()
    logger.debug("Fetched %d history entries for approval id=%d", len(history), approval_id)
    return history
