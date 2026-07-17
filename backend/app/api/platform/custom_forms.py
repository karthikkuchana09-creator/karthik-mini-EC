from fastapi import APIRouter, Depends, Query, Body, status
from sqlalchemy.orm import Session
from typing import Optional
from fastapi_pagination import Page
from app.schemas.platform.custom_form import (
    FormCreate, FormUpdate, FormOut,
    FormFieldCreate, FormFieldUpdate, FormFieldOut,
    FormSubmissionCreate, FormSubmissionOut,
)
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.platform.custom_form_service import (
    create_form, get_form, list_forms, update_form, delete_form,
    create_form_field, list_form_fields, get_form_field, update_form_field, delete_form_field,
    submit_form, get_submissions,
)

router = APIRouter(prefix="/custom-forms", tags=["Custom Forms"])


# ---------------------------------------------------------------------------
# Forms
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=FormOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create custom form",
    description="Create a reusable form with field definitions. Requires custom_form:create permission.",
)
def create_form_endpoint(
    data: FormCreate = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_create)),
):
    return create_form(db, data, user, tenant_id=user.tenant_id)


@router.get(
    "",
    response_model=Page[FormOut],
    summary="List custom forms",
    description="Retrieve all custom forms with optional title search. Includes submission counts. Requires custom_form:read permission.",
)
def list_forms_endpoint(
    search: Optional[str] = Query(None, description="Search by title"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_read)),
):
    return list_forms(db, tenant_id=user.tenant_id, search=search, page=page, size=size)


@router.get(
    "/{form_id}",
    response_model=FormOut,
    summary="Get custom form",
    description="Retrieve a single form by ID with submission count. Requires custom_form:read permission.",
)
def get_form_endpoint(
    form_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_read)),
):
    return get_form(db, form_id, tenant_id=user.tenant_id)


@router.put(
    "/{form_id}",
    response_model=FormOut,
    summary="Update custom form",
    description="Update form title, description, status, or field configuration. Requires custom_form:update permission.",
)
def update_form_endpoint(
    form_id: int,
    data: FormUpdate = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_update)),
):
    return update_form(db, form_id, data, user, tenant_id=user.tenant_id)


@router.delete(
    "/{form_id}",
    summary="Delete custom form",
    description="Permanently delete a form and all its submissions and field definitions. Requires custom_form:delete permission.",
)
def delete_form_endpoint(
    form_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_delete)),
):
    return delete_form(db, form_id, user, tenant_id=user.tenant_id)


# ---------------------------------------------------------------------------
# Fields
# ---------------------------------------------------------------------------

@router.post(
    "/{form_id}/fields",
    response_model=FormFieldOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add form field",
    description="Add a field to a custom form. Supported types: TEXT, NUMBER, DATE, SELECT, FILE. "
                "SELECT fields require 'options'. Validation rules are stored as JSON. "
                "Requires custom_form:update permission.",
)
def create_field_endpoint(
    form_id: int,
    data: FormFieldCreate = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_update)),
):
    return create_form_field(db, form_id, data, user, tenant_id=user.tenant_id)


@router.get(
    "/{form_id}/fields",
    response_model=list[FormFieldOut],
    summary="List form fields",
    description="Retrieve all fields for a form, ordered by sort_order. Requires custom_form:read permission.",
)
def list_fields_endpoint(
    form_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_read)),
):
    return list_form_fields(db, form_id, tenant_id=user.tenant_id)


@router.get(
    "/{form_id}/fields/{field_id}",
    response_model=FormFieldOut,
    summary="Get form field",
    description="Retrieve a single field by ID. Requires custom_form:read permission.",
)
def get_field_endpoint(
    form_id: int,
    field_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_read)),
):
    return get_form_field(db, form_id, field_id, tenant_id=user.tenant_id)


@router.put(
    "/{form_id}/fields/{field_id}",
    response_model=FormFieldOut,
    summary="Update form field",
    description="Update a field's type, label, validation rules, etc. Requires custom_form:update permission.",
)
def update_field_endpoint(
    form_id: int,
    field_id: int,
    data: FormFieldUpdate = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_update)),
):
    return update_form_field(db, form_id, field_id, data, user, tenant_id=user.tenant_id)


@router.delete(
    "/{form_id}/fields/{field_id}",
    summary="Delete form field",
    description="Remove a field from a form. Requires custom_form:update permission.",
)
def delete_field_endpoint(
    form_id: int,
    field_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_update)),
):
    return delete_form_field(db, form_id, field_id, user, tenant_id=user.tenant_id)


# ---------------------------------------------------------------------------
# Submissions
# ---------------------------------------------------------------------------

@router.post(
    "/{form_id}/submit",
    response_model=FormSubmissionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Submit form",
    description="Submit data for an active form. Requires custom_form:submit permission.",
)
def submit_form_endpoint(
    form_id: int,
    data: FormSubmissionCreate = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_submit)),
):
    return submit_form(db, form_id, data, user, tenant_id=user.tenant_id)


@router.get(
    "/{form_id}/submissions",
    response_model=Page[FormSubmissionOut],
    summary="List form submissions",
    description="Retrieve all submissions for a form, newest first. Requires custom_form:read permission.",
)
def list_submissions_endpoint(
    form_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.custom_form_read)),
):
    return get_submissions(db, form_id, tenant_id=user.tenant_id, page=page, size=size)
