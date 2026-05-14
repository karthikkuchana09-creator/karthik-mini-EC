from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.comment import CommentCreate, CommentOut
from app.api.deps import get_db, rate_limit
from app.core.rbac import require_permission, Permissions
from app.core.config import settings
from app.services.comment_service import add_comment, get_comments, delete_all_comments

router = APIRouter(prefix="/tasks")


@router.post("/{task_id}/comments", response_model=CommentOut)
def add_comment_endpoint(
    task_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.comment_create)),
    _=Depends(rate_limit(settings.RATE_LIMIT_COMMENT, settings.RATE_LIMIT_COMMENT_WINDOW, "comment_create")),
):
    return add_comment(db, task_id, data, user)


@router.get("/{task_id}/comments", response_model=list[CommentOut])
def get_comments_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.comment_read)),
    _=Depends(rate_limit(settings.RATE_LIMIT_DEFAULT, settings.RATE_LIMIT_DEFAULT_WINDOW, "comment_read")),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    return get_comments(db, task_id, user, page=page, size=size)


@router.delete("/{task_id}/comments")
def delete_all_comments_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.comment_delete)),
    _=Depends(rate_limit(settings.RATE_LIMIT_DEFAULT, settings.RATE_LIMIT_DEFAULT_WINDOW, "comment_delete")),
):
    return delete_all_comments(db, task_id, user)
