from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.approval import Approval
from app.models.approval_history import ApprovalHistory
from app.models.user import User
from app.schemas.approval import ApprovalCreate, ApprovalAction


def create_approval(db: Session, approval_data: ApprovalCreate, current_user):
    approval = Approval(
        title=approval_data.title,
        description=approval_data.description,
        requested_by=current_user.id
    )

    db.add(approval)
    db.commit()
    db.refresh(approval)

    return approval


def get_approvals(db: Session, current_user):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

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
    return result


def take_approval_action(db: Session, approval_id: int, action_data: ApprovalAction, current_user):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    approval = db.query(Approval).filter(Approval.id == approval_id).first()

    if not approval:
        raise HTTPException(404, "Approval not found")

    if role == "employee":
        raise HTTPException(403, "Not allowed")

    current_level = approval.current_level
    if current_level == "manager" and role != "manager":
        raise HTTPException(403, "Manager approval required")

    if current_level == "admin" and role != "admin":
        raise HTTPException(403, "Admin approval required")

    if action_data.action == "rejected" and not action_data.comment:
        raise HTTPException(400, "Comment required for rejection")

    if action_data.action == "approved":
        if current_level == "manager":
            approval.current_level = "admin"
            approval.status = "pending"
        else:
            approval.status = "approved"

    elif action_data.action == "rejected":
        approval.status = "rejected"

    elif action_data.action == "hold":
        approval.status = "on_hold"

    else:
        raise HTTPException(400, "Invalid action")

    history = ApprovalHistory(
        approval_id=approval.id,
        action_by=current_user.id,
        action=action_data.action,
        comment=action_data.comment
    )

    db.add(history)
    db.commit()

    return {"message": "Action completed"}


def get_approval_history(db: Session, approval_id: int):
    return db.query(ApprovalHistory).filter(
        ApprovalHistory.approval_id == approval_id
    ).all()
