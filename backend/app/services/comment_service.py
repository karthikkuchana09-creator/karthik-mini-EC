from fastapi import HTTPException
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from fastapi_pagination import Params
from fastapi_pagination.ext.sqlalchemy import paginate as fastapi_paginate
from app.models.comment import Comment
from app.models.task import Task
from app.schemas.comment import CommentCreate
from app.core.log import get_logger
from app.services.audit_log_service import log_action
from app.services.notification_service import create_comment_notification

logger = get_logger("comment_service")


def add_comment(db: Session, task_id: int, comment_data: CommentCreate, current_user):
    logger.info("Adding comment to task id=%d by user_id=%d is_internal=%s",
                task_id, current_user.id, comment_data.is_internal)

    task = db.scalar(select(Task).where(Task.id == task_id))

    if not task:
        logger.warning("Comment failed: task not found id=%d", task_id)
        raise HTTPException(404, "Task not found")

    comment = Comment(
        task_id=task_id,
        user_id=current_user.id,
        content=comment_data.content,
        is_internal=comment_data.is_internal
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    log_action(
        db, current_user.id, "create", "comment", comment.id,
        new_value={"task_id": task_id, "is_internal": comment_data.is_internal},
    )
    notify_user_id = task.assigned_to_id if task.assigned_to_id != current_user.id else task.created_by_id
    if notify_user_id:
        create_comment_notification(db, notify_user_id, task_id)
    logger.info("Comment id=%d added to task id=%d successfully", comment.id, task_id)
    return comment


def get_comments(
    db: Session,
    task_id: int,
    current_user,
    page: int = 1,
    size: int = 50,
):
    logger.debug("Fetching comments for task id=%d by user_id=%d", task_id, current_user.id)

    query = select(Comment).where(Comment.task_id == task_id)

    if current_user.role == "employee":
        query = query.where(Comment.is_internal == False)

    result = fastapi_paginate(db, query.order_by(Comment.created_at.desc()), Params(page=page, size=size))
    logger.debug("Fetched %d comments for task id=%d", len(result.items), task_id)
    return result


def delete_all_comments(db: Session, task_id: int, current_user):
    task = db.scalar(select(Task).where(Task.id == task_id))
    if not task:
        raise HTTPException(404, "Task not found")

    if current_user.role == "employee":
        raise HTTPException(403, "Not enough permissions")

    result = db.execute(delete(Comment).where(Comment.task_id == task_id))
    count = result.rowcount
    db.commit()

    log_action(db, current_user.id, "delete", "comment", task_id, old_value={"task_id": task_id, "count": count})
    return {"message": f"Deleted {count} comments"}
