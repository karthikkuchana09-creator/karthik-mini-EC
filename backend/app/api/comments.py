from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.comment import CommentCreate, CommentOut
from app.api.deps import get_db, get_current_user
from app.services.comment_service import add_comment, get_comments

router = APIRouter(prefix="/tasks")

@router.post("/{task_id}/comments", response_model=CommentOut)
def add_comment_endpoint(
    task_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return add_comment(db, task_id, data, user)

@router.get("/{task_id}/comments", response_model=list[CommentOut])
def get_comments_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return get_comments(db, task_id, user)