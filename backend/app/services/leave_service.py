from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.leave import Leave
from app.schemas.leave import LeaveCreate, LeaveUpdate
from app.core.log import get_logger

logger = get_logger("leave_service")


def create_leave(db: Session, current_user, data: LeaveCreate):
    if data.end_date < data.start_date:
        raise HTTPException(400, "End date cannot be earlier than start date")

    leave = Leave(
        user_id=current_user.id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        status="Pending",
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    logger.info("Leave created id=%d for user_id=%d", leave.id, current_user.id)
    return leave


def get_user_leaves(db: Session, current_user):
    return (
        db.execute(
            select(Leave)
            .where(Leave.user_id == current_user.id)
            .order_by(Leave.created_at.desc())
        ).scalars().all()
    )


def update_leave(db: Session, leave_id: int, current_user, data: LeaveUpdate):
    leave = db.scalar(select(Leave).where(
        Leave.id == leave_id,
        Leave.user_id == current_user.id,
    ))

    if not leave:
        raise HTTPException(404, "Leave not found")
    if leave.status != "Pending":
        raise HTTPException(400, "Only pending leaves can be edited")

    update_data = data.model_dump(exclude_unset=True)

    if "end_date" in update_data and "start_date" not in update_data:
        if update_data["end_date"] < leave.start_date:
            raise HTTPException(400, "End date cannot be earlier than start date")
    elif "start_date" in update_data and "end_date" not in update_data:
        if leave.end_date < update_data["start_date"]:
            raise HTTPException(400, "End date cannot be earlier than start date")
    elif "start_date" in update_data and "end_date" in update_data:
        if update_data["end_date"] < update_data["start_date"]:
            raise HTTPException(400, "End date cannot be earlier than start date")

    for field, value in update_data.items():
        setattr(leave, field, value)

    db.commit()
    db.refresh(leave)
    logger.info("Leave updated id=%d for user_id=%d", leave.id, current_user.id)
    return leave
