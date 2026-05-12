from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.schemas.document import DocumentOut, TaskDocumentsOut
from app.api.deps import get_db, require_roles
from app.services.document_service import (
    upload_document,
    get_documents,
    get_document,
    get_task_documents,
    get_document_versions,
    download_document,
    delete_document,
)

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentOut)
def upload_document_endpoint(
    file: UploadFile = File(...),
    task_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager", "employee"])),
):
    return upload_document(db, file, user, task_id)


@router.get("/", response_model=list[DocumentOut])
def list_documents_endpoint(
    task_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager", "employee"])),
):
    return get_documents(db, user, task_id)


@router.get("/task/{task_id}", response_model=TaskDocumentsOut)
def list_task_documents_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager", "employee"])),
):
    return get_task_documents(db, task_id, user)


@router.get("/versions", response_model=list[DocumentOut])
def list_versions_endpoint(
    file_name: str = Query(...),
    task_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager", "employee"])),
):
    return get_document_versions(db, file_name, task_id, user)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager", "employee"])),
):
    return get_document(db, document_id, user)


@router.get("/{document_id}/download")
def download_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager", "employee"])),
):
    return download_document(db, document_id, user)


@router.delete("/{document_id}")
def delete_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles(["admin", "manager", "employee"])),
):
    return delete_document(db, document_id, user)
