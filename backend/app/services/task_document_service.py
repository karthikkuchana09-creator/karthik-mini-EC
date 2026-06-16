import os
import mimetypes
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.task_document import TaskDocument
from app.models.task import Task
from app.models.user import User
from app.schemas.task_document import TaskDocumentUpload
from app.repository.task_document_repository import list_documents_by_task
from app.core.file_validator import validate_uploaded_file, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB
from app.utils.file_helpers import unique_filename, safe_join
from app.services.audit_log_service import log_action
from app.services.phase10_notification_helper import notify_task_document_uploaded
from app.core.log import get_logger

logger = get_logger("task_document_service")

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads", "task_documents",
)


def _get_task_or_404(db: Session, task_id: int) -> Task:
    task = db.scalar(select(Task).where(Task.id == task_id))
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def _can_manage_documents(task: Task, user: User) -> bool:
    if user.role.value in ("manager", "admin", "super_admin"):
        return True
    if task.created_by_id == user.id:
        return True
    if task.assigned_to_id == user.id:
        return True
    return False


def upload_task_document(
    db: Session,
    task_id: int,
    file: UploadFile,
    data: TaskDocumentUpload,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> TaskDocument:
    task = _get_task_or_404(db, task_id)

    if not _can_manage_documents(task, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only task creator, assignee, or manager can upload documents",
        )

    safe_name = validate_uploaded_file(file)

    content = file.file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {MAX_FILE_SIZE_MB}MB",
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    saved_name = unique_filename(safe_name)
    file_path = safe_join(UPLOAD_DIR, saved_name)

    with open(file_path, "wb") as f:
        f.write(content)

    document = TaskDocument(
        task_id=task_id,
        file_name=safe_name,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by=user.id,
        document_type=data.document_type,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    log_action(
        db, user.id, "upload", "task_document", document.id,
        new_value={"file_name": document.file_name, "file_size": document.file_size, "mime_type": document.mime_type, "document_type": document.document_type, "task_id": task_id},
        module_name="task_document", action_type="upload", record_id=document.id,
        ip_address=ip_address, user_agent=user_agent,
    )

    notify_ids = {task.created_by_id, task.assigned_to_id} - {user.id}
    for uid in notify_ids:
        if uid:
            notify_task_document_uploaded(db, uid, document.id, document.file_name, task_id)

    logger.info("Task document %d uploaded to task %d by user %d", document.id, task_id, user.id)
    return document


def list_task_documents(
    db: Session,
    task_id: int,
    user: User,
):
    task = _get_task_or_404(db, task_id)
    if not _can_manage_documents(task, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view documents for this task",
        )
    return list_documents_by_task(db, task_id)


def download_task_document(
    db: Session,
    document_id: int,
    user: User,
):
    document = db.scalar(
        select(TaskDocument)
        .options(selectinload(TaskDocument.task))
        .where(TaskDocument.id == document_id)
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not _can_manage_documents(document.task, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to download this document",
        )

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    media_type, _ = mimetypes.guess_type(document.file_name)
    return FileResponse(
        path=document.file_path,
        media_type=media_type or "application/octet-stream",
        filename=document.file_name,
        headers={
            "Content-Disposition": f'attachment; filename="{document.file_name}"'
        },
    )


def delete_task_document(
    db: Session,
    document_id: int,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
):
    document = db.scalar(
        select(TaskDocument)
        .options(selectinload(TaskDocument.task))
        .where(TaskDocument.id == document_id)
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not _can_manage_documents(document.task, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only task creator, assignee, or manager can delete documents",
        )

    old_info = {"file_name": document.file_name, "file_size": document.file_size, "document_type": document.document_type}

    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    db.delete(document)
    db.commit()

    log_action(
        db, user.id, "delete", "task_document", document_id,
        old_value=old_info,
        module_name="task_document", action_type="delete", record_id=document_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Task document %d deleted by user %d", document_id, user.id)
    return {"message": "Document deleted"}
