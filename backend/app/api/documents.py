from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional
from fastapi_pagination import Page
from app.schemas.document import DocumentOut, TaskDocumentsOut
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.core.credit_access import deduct_feature_credits
from app.repository.document_repository import list_all_documents
from app.services.document_service import (
    upload_document,
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
    user=Depends(require_permission(Permissions.document_upload)),
):
    result = upload_document(db, file, user, task_id)
    if file.size:
        deduct_feature_credits(db, user, "document_upload_per_mb")
    return result


@router.get("", response_model=Page[DocumentOut])
def list_documents_endpoint(
    task_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.document_read)),
):
    return list_all_documents(db, task_id=task_id)


@router.get("/task/{task_id}", response_model=TaskDocumentsOut)
def list_task_documents_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.document_read)),
):
    return get_task_documents(db, task_id, user)


@router.get("/versions", response_model=list[DocumentOut])
def list_versions_endpoint(
    file_name: str = Query(...),
    task_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.document_read)),
):
    return get_document_versions(db, file_name, task_id, user)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.document_read)),
):
    return get_document(db, document_id, user)


@router.get("/{document_id}/download")
def download_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.document_read)),
):
    return download_document(db, document_id, user)


@router.delete("/{document_id}")
def delete_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.document_delete)),
):
    return delete_document(db, document_id, user)
