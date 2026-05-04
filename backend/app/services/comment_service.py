from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.comment import Comment
from app.models.task import Task
from app.schemas.comment import CommentCreate, CommentOut


def add_comment(db: Session, task_id: int, comment_data: CommentCreate, current_user):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
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

    return comment


def get_comments(db: Session, task_id: int, current_user):
    query = db.query(Comment).filter(Comment.task_id == task_id)

    if current_user.role == "employee":
        query = query.filter(Comment.is_internal == False)

    return query.order_by(Comment.created_at.desc()).all()
