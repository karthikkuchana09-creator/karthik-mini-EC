import os
import mimetypes
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.approval_document import ApprovalDocument
from app.models.approval import Approval
from app.models.user import User
from app.schemas.approval_document import ApprovalDocumentUpload
from app.repository.approval_document_repository import list_documents_by_approval
from app.core.file_validator import validate_uploaded_file, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB
from app.utils.file_helpers import unique_filename, safe_join
from app.services.audit_log_service import log_action
from app.services.phase10_notification_helper import notify_approval_document_uploaded
from app.core.log import get_logger

logger = get_logger("approval_document_service")

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads", "approval_documents",
)


def _get_approval_or_404(db: Session, approval_id: int) -> Approval:
    approval = db.scalar(select(Approval).where(Approval.id == approval_id))
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")
    return approval


def _can_manage_documents(approval: Approval, user: User) -> bool:
    if user.role.value in ("admin", "super_admin"):
        return True
    if approval.requested_by == user.id:
        return True
    if user.role.value == "manager":
        return True
    return False


def upload_approval_document(
    db: Session,
    approval_id: int,
    file: UploadFile,
    data: ApprovalDocumentUpload,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> ApprovalDocument:
    approval = _get_approval_or_404(db, approval_id)

    if not _can_manage_documents(approval, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only requester, approver, or admin can upload documents",
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

    document = ApprovalDocument(
        approval_id=approval_id,
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
        db, user.id, "upload", "approval_document", document.id,
        new_value={"file_name": document.file_name, "file_size": document.file_size, "mime_type": document.mime_type, "document_type": document.document_type, "approval_id": approval_id},
        module_name="approval_document", action_type="upload", record_id=document.id,
        ip_address=ip_address, user_agent=user_agent,
    )

    if approval.requested_by != user.id:
        notify_approval_document_uploaded(db, approval.requested_by, document.id, document.file_name, approval_id)

    logger.info("Approval document %d uploaded to approval %d by user %d", document.id, approval_id, user.id)
    return document


def list_approval_documents(
    db: Session,
    approval_id: int,
    user: User,
):
    approval = _get_approval_or_404(db, approval_id)
    if not _can_manage_documents(approval, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view documents for this approval",
        )
    return list_documents_by_approval(db, approval_id)


def download_approval_document(
    db: Session,
    document_id: int,
    user: User,
):
    document = db.scalar(
        select(ApprovalDocument)
        .options(selectinload(ApprovalDocument.approval))
        .where(ApprovalDocument.id == document_id)
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not _can_manage_documents(document.approval, user):
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


def delete_approval_document(
    db: Session,
    document_id: int,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
):
    document = db.scalar(
        select(ApprovalDocument)
        .options(selectinload(ApprovalDocument.approval))
        .where(ApprovalDocument.id == document_id)
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not _can_manage_documents(document.approval, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only requester, approver, or admin can delete documents",
        )

    old_info = {"file_name": document.file_name, "file_size": document.file_size, "document_type": document.document_type}

    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    db.delete(document)
    db.commit()

    log_action(
        db, user.id, "delete", "approval_document", document_id,
        old_value=old_info,
        module_name="approval_document", action_type="delete", record_id=document_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Approval document %d deleted by user %d", document_id, user.id)
    return {"message": "Document deleted"}
