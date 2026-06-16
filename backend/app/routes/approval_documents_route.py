from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.approval_document import (
    ApprovalDocumentUpload,
    ApprovalDocumentResponse,
)
from app.models.user import User
from app.services.approval_document_service import (
    upload_approval_document,
    list_approval_documents,
    download_approval_document,
    delete_approval_document,
)
from fastapi_pagination import Page

router = APIRouter(tags=["Approval Documents"])


@router.post(
    "/approvals/{approval_id}/documents",
    response_model=ApprovalDocumentResponse,
    status_code=201,
)
def upload_approval_document_endpoint(
    approval_id: int,
    request: Request,
    file: UploadFile = File(...),
    document_type: str = Form("OTHER"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = ApprovalDocumentUpload(document_type=document_type)
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return upload_approval_document(db, approval_id, file, data, user, ip_address, user_agent)


@router.get(
    "/approvals/{approval_id}/documents",
    response_model=Page[ApprovalDocumentResponse],
)
def list_approval_documents_endpoint(
    approval_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_approval_documents(db, approval_id, user)


@router.get(
    "/approval-documents/{document_id}/download",
)
def download_approval_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return download_approval_document(db, document_id, user)


@router.delete(
    "/approval-documents/{document_id}",
)
def delete_approval_document_endpoint(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return delete_approval_document(db, document_id, user, ip_address, user_agent)
