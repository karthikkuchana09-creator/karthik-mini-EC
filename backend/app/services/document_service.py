import os
import mimetypes
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.document import Document
from app.core.log import get_logger
from app.utils.file_helpers import allowed_file, MAX_FILE_SIZE, unique_filename, safe_join
from app.services.audit_log_service import log_action

logger = get_logger("document_service")

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads"
)


def _next_version(db: Session, file_name: str, task_id: int | None) -> int:
    filters = [Document.file_name == file_name]
    if task_id is not None:
        filters.append(Document.task_id == task_id)
    else:
        filters.append(Document.task_id.is_(None))

    max_ver = (
        db.query(func.coalesce(func.max(Document.version), 0))
        .filter(*filters)
        .scalar()
    )
    return max_ver + 1


def upload_document(
    db: Session,
    file: UploadFile,
    current_user,
    task_id: int | None = None,
):
    if not file.filename or not file.filename.strip():
        raise HTTPException(400, "Filename is required")

    if not allowed_file(file.filename):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"File type not allowed. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    logger.info(
        "Uploading document: file_name=%s size=%d by user_id=%d task_id=%s",
        file.filename, len(content), current_user.id, task_id
    )

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    saved_name = unique_filename(file.filename)
    try:
        file_path = safe_join(UPLOAD_DIR, saved_name)
    except ValueError:
        raise HTTPException(400, "Invalid file path")

    with open(file_path, "wb") as f:
        f.write(content)

    version = _next_version(db, file.filename, task_id)

    document = Document(
        file_name=file.filename,
        file_path=file_path,
        version=version,
        uploaded_by=current_user.id,
        task_id=task_id,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    log_action(db, current_user.id, "upload", "document", document.id)
    logger.info(
        "Document uploaded: id=%d file_name=%s v%d",
        document.id, document.file_name, document.version
    )
    return document


def get_document(db: Session, document_id: int, current_user):
    logger.debug("Fetching document id=%d by user_id=%d", document_id, current_user.id)
    doc = db.query(Document).filter(Document.id == document_id).first()

    if not doc:
        raise HTTPException(404, "Document not found")

    if current_user.role.value != "admin" and doc.uploaded_by != current_user.id:
        raise HTTPException(403, "Not allowed")

    return doc


def download_document(db: Session, document_id: int, current_user):
    logger.debug("Downloading document id=%d by user_id=%d", document_id, current_user.id)
    doc = get_document(db, document_id, current_user)

    if not os.path.exists(doc.file_path):
        raise HTTPException(404, "File not found on disk")

    media_type, _ = mimetypes.guess_type(doc.file_name)
    return FileResponse(
        path=doc.file_path,
        media_type=media_type or "application/octet-stream",
        filename=doc.file_name,
        headers={
            "Content-Disposition": f'attachment; filename="{doc.file_name}"'
        },
    )


def get_documents(db: Session, current_user, task_id: int | None = None):
    logger.debug("Fetching documents for user_id=%d", current_user.id)
    query = db.query(Document)

    if current_user.role.value != "admin":
        query = query.filter(Document.uploaded_by == current_user.id)

    if task_id is not None:
        query = query.filter(Document.task_id == task_id)

    return query.all()


def get_task_documents(db: Session, task_id: int, current_user):
    logger.debug("Fetching task documents task_id=%d by user_id=%d", task_id, current_user.id)
    filters = [Document.task_id == task_id]

    if current_user.role.value != "admin":
        filters.append(Document.uploaded_by == current_user.id)

    docs = (
        db.query(Document)
        .filter(*filters)
        .order_by(Document.file_name.asc(), Document.version.asc())
        .all()
    )

    return {
        "task_id": task_id,
        "total": len(docs),
        "documents": docs,
    }


def get_document_versions(db: Session, file_name: str, task_id: int | None, current_user):
    logger.debug(
        "Fetching versions for file_name=%s task_id=%s by user_id=%d",
        file_name, task_id, current_user.id
    )
    filters = [Document.file_name == file_name]
    if task_id is not None:
        filters.append(Document.task_id == task_id)
    else:
        filters.append(Document.task_id.is_(None))

    if current_user.role.value != "admin":
        filters.append(Document.uploaded_by == current_user.id)

    return (
        db.query(Document)
        .filter(*filters)
        .order_by(Document.version.asc())
        .all()
    )


def delete_document(db: Session, document_id: int, current_user):
    logger.info("Deleting document id=%d by user_id=%d", document_id, current_user.id)
    doc = db.query(Document).filter(Document.id == document_id).first()

    if not doc:
        raise HTTPException(404, "Document not found")

    if current_user.role.value != "admin" and doc.uploaded_by != current_user.id:
        raise HTTPException(403, "Not allowed")

    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    db.delete(doc)
    db.commit()

    log_action(db, current_user.id, "delete", "document", document_id)
    logger.info("Document id=%d deleted successfully", document_id)
    return {"message": "Document deleted"}
