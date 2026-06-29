from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, Request
from sqlalchemy.orm import Session
from app.schemas.project_document import (
    ProjectDocumentUploadResponse,
    ProjectDocumentOut,
    ProjectDocumentListResponse,
)
from app.routes.deps import get_db, get_current_user
from app.models.user import User
from app.services.project_document_service import (
    upload_project_document,
    list_project_documents,
    get_project_document,
    download_project_document,
    delete_project_document,
)

router = APIRouter(tags=["Project Documents"])


@router.post(
    "/projects/{project_id}/documents/upload",
    response_model=ProjectDocumentUploadResponse,
    status_code=201,
)
def upload_project_document_endpoint(
    project_id: int,
    file: UploadFile = File(...),
    document_type: str = Form("OTHER"),
    request: Request = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request and request.client else None
    user_agent = request.headers.get("user-agent") if request else None
    return upload_project_document(db, project_id, file, user, document_type, ip_address, user_agent)


@router.get(
    "/projects/{project_id}/documents",
    response_model=ProjectDocumentListResponse,
)
def list_project_documents_endpoint(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    document_type: Optional[str] = Query(None),
):
    return list_project_documents(db, project_id, user, document_type)


@router.get(
    "/projects/{project_id}/documents/{document_id}",
    response_model=ProjectDocumentOut,
)
def get_project_document_endpoint(
    project_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_project_document(db, project_id, document_id, user)


@router.get(
    "/projects/{project_id}/documents/{document_id}/download",
)
def download_project_document_endpoint(
    project_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return download_project_document(db, project_id, document_id, user)


@router.delete(
    "/projects/{project_id}/documents/{document_id}",
)
def delete_project_document_endpoint(
    project_id: int,
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return delete_project_document(db, project_id, document_id, user, ip_address, user_agent)
