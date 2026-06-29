import os
import mimetypes
from typing import Optional
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.project_document import ProjectDocument, DocumentType
from app.models.user import User
from app.core.log import get_logger
from app.core.tenant import tenant_filter
from app.services.business_validation_service import get_project_or_404, validate_workspace_member
from app.utils.file_helpers import allowed_file, MAX_FILE_SIZE, unique_filename, safe_join
from app.services.audit_log_service import log_action

logger = get_logger("project_document_service")

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads",
    "projects",
)


def upload_project_document(
    db: Session,
    project_id: int,
    file: UploadFile,
    user: User,
    document_type: str = "OTHER",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> ProjectDocument:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    if not file.filename or not file.filename.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed",
        )

    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB",
        )

    mime_type = file.content_type or "application/octet-stream"

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    saved_name = unique_filename(file.filename)
    try:
        file_path = safe_join(UPLOAD_DIR, saved_name)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path")

    with open(file_path, "wb") as f:
        f.write(content)

    try:
        doc_type = DocumentType(document_type.upper())
    except ValueError:
        doc_type = DocumentType.OTHER

    tid = getattr(user, "tenant_id", None)
    document = ProjectDocument(
        project_id=project_id,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=mime_type,
        document_type=doc_type,
        uploaded_by=user.id,
        tenant_id=tid,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    log_action(
        db, user.id, "upload", "project_document", document.id,
        new_value={"file_name": document.file_name, "project_id": project_id, "document_type": document.document_type.value},
        module_name="project_document", action_type="create", record_id=document.id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Project document %d uploaded to project %d by user %d", document.id, project_id, user.id)
    return document


def list_project_documents(
    db: Session,
    project_id: int,
    user: User,
    document_type: Optional[str] = None,
) -> dict:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    filters = [ProjectDocument.project_id == project_id]
    if tid is not None:
        filters.append(ProjectDocument.tenant_id == tid)
    if document_type:
        filters.append(ProjectDocument.document_type == DocumentType(document_type.upper()))

    docs = (
        db.execute(
            select(ProjectDocument)
            .where(*filters)
            .order_by(ProjectDocument.created_at.desc())
        )
        .scalars()
        .all()
    )
    return {"total": len(docs), "documents": docs}


def get_project_document(
    db: Session,
    project_id: int,
    document_id: int,
    user: User,
) -> ProjectDocument:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    doc = db.scalar(
        tenant_filter(select(ProjectDocument), ProjectDocument, tid)
        .where(
            ProjectDocument.id == document_id,
            ProjectDocument.project_id == project_id,
        )
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


def download_project_document(
    db: Session,
    project_id: int,
    document_id: int,
    user: User,
):
    doc = get_project_document(db, project_id, document_id, user)

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    media_type, _ = mimetypes.guess_type(doc.file_name)
    return FileResponse(
        path=doc.file_path,
        media_type=media_type or "application/octet-stream",
        filename=doc.file_name,
        headers={"Content-Disposition": f'attachment; filename="{doc.file_name}"'},
    )


def delete_project_document(
    db: Session,
    project_id: int,
    document_id: int,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    doc = get_project_document(db, project_id, document_id, user)
    from app.services.business_validation_service import validate_file_owner
    validate_file_owner(doc, user)

    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    db.delete(doc)
    db.commit()

    log_action(
        db, user.id, "delete", "project_document", document_id,
        old_value={"file_name": doc.file_name, "project_id": project_id},
        module_name="project_document", action_type="delete", record_id=document_id,
        ip_address=ip_address, user_agent=user_agent,
    )
    logger.info("Project document %d deleted by user %d", document_id, user.id)
    return {"message": "Document deleted"}
