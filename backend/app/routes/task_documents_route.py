from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.task_document import (
    TaskDocumentUpload,
    TaskDocumentResponse,
)
from app.models.user import User
from app.services.task_document_service import (
    upload_task_document,
    list_task_documents,
    download_task_document,
    delete_task_document,
)
from fastapi_pagination import Page

router = APIRouter(tags=["Task Documents"])


@router.post(
    "/tasks/{task_id}/documents",
    response_model=TaskDocumentResponse,
    status_code=201,
)
def upload_task_document_endpoint(
    task_id: int,
    request: Request,
    file: UploadFile = File(...),
    document_type: str = Form("OTHER"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = TaskDocumentUpload(document_type=document_type)
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return upload_task_document(db, task_id, file, data, user, ip_address, user_agent, tenant_id=user.tenant_id)


@router.get(
    "/tasks/{task_id}/documents",
    response_model=Page[TaskDocumentResponse],
)
def list_task_documents_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_task_documents(db, task_id, user, tenant_id=user.tenant_id)


@router.get(
    "/task-documents/{document_id}/download",
)
def download_task_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return download_task_document(db, document_id, user, tenant_id=user.tenant_id)


@router.delete(
    "/task-documents/{document_id}",
)
def delete_task_document_endpoint(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return delete_task_document(db, document_id, user, ip_address, user_agent, tenant_id=user.tenant_id)
