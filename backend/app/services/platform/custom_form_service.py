from typing import Optional
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.platform.custom_form import CustomForm
from app.models.platform.custom_form_field import CustomFormField, FIELD_TYPES
from app.models.platform.form_submission import FormSubmission
from app.core.tenant import tenant_filter
from app.services.enterprise_audit_service import (
    log_form_create, log_form_update, log_form_delete,
    log_form_field_create, log_form_field_update, log_form_field_delete,
    log_form_submission,
)
from app.core.cache import cached, invalidate
from app.core.config import settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _enrich_with_counts(forms: list, db: Session, tenant_id: int | None = None):
    form_ids = [f.id for f in forms]
    counts = {}
    if form_ids:
        count_query = select(FormSubmission.form_id, func.count(FormSubmission.id).label("c")).where(
            FormSubmission.form_id.in_(form_ids)
        )
        if tenant_id:
            count_query = count_query.where(FormSubmission.tenant_id == tenant_id)
        rows = db.execute(count_query.group_by(FormSubmission.form_id)).all()
        counts = {r.form_id: r.c for r in rows}
    results = []
    for f in forms:
        d = {c.name: getattr(f, c.name) for c in f.__table__.columns}
        d["submission_count"] = counts.get(f.id, 0)
        results.append(d)
    return results


def _form_to_dict(form, db: Session, tenant_id: int | None = None):
    d = {c.name: getattr(form, c.name) for c in form.__table__.columns}
    count_query = select(func.count(FormSubmission.id)).where(FormSubmission.form_id == form.id)
    if tenant_id:
        count_query = count_query.where(FormSubmission.tenant_id == tenant_id)
    d["submission_count"] = db.scalar(count_query) or 0
    return d


@invalidate(patterns=["cf:list*"])
def create_form(db: Session, data, user, tenant_id: int | None = None):
    form = CustomForm(
        title=data.title,
        description=data.description,
        status=data.status,
        fields_config=[f.model_dump() for f in data.fields_config],
        created_by=user.id,
        tenant_id=tenant_id,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    log_form_create(db, user.id, form.id, {"title": form.title, "status": form.status})
    return _form_to_dict(form, db, tenant_id)


def get_form(db: Session, form_id: int, tenant_id: int | None = None):
    form = db.scalar(
        tenant_filter(select(CustomForm), CustomForm, tenant_id)
        .where(CustomForm.id == form_id)
    )
    if not form:
        raise HTTPException(404, "Form not found")
    return _form_to_dict(form, db, tenant_id)


@cached(prefix="cf:list", ttl=lambda: settings.CACHE_TTL_DEFAULT, exclude_args=[0])
def list_forms(db: Session, tenant_id: int | None = None, search: str | None = None, page: int = 1, size: int = 20):
    query = tenant_filter(select(CustomForm), CustomForm, tenant_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(CustomForm.title.ilike(pattern))
    query = query.order_by(CustomForm.updated_at.desc())
    return paginate(db, query)


@invalidate(patterns=["cf:list*"])
def update_form(db: Session, form_id: int, data, user, tenant_id: int | None = None):
    form = db.scalar(
        tenant_filter(select(CustomForm), CustomForm, tenant_id)
        .where(CustomForm.id == form_id)
    )
    if not form:
        raise HTTPException(404, "Form not found")
    update_data = data.model_dump(exclude_unset=True)
    if "fields_config" in update_data and update_data["fields_config"] is not None:
        update_data["fields_config"] = [f.model_dump() if hasattr(f, "model_dump") else f for f in update_data["fields_config"]]
    for key, val in update_data.items():
        if val is not None:
            setattr(form, key, val)
    db.commit()
    db.refresh(form)
    log_form_update(db, user.id, form_id, None, {"title": form.title})
    return _form_to_dict(form, db, tenant_id)


@invalidate(patterns=["cf:list*"])
def delete_form(db: Session, form_id: int, user, tenant_id: int | None = None):
    form = db.scalar(
        tenant_filter(select(CustomForm), CustomForm, tenant_id)
        .where(CustomForm.id == form_id)
    )
    if not form:
        raise HTTPException(404, "Form not found")
    db.delete(form)
    db.commit()
    log_form_delete(db, user.id, form_id, {"title": form.title})
    return {"message": "Form deleted"}


# ---------------------------------------------------------------------------
# Fields
# ---------------------------------------------------------------------------

@invalidate(patterns=["cf:list*"])
def create_form_field(db: Session, form_id: int, data, user, tenant_id: int | None = None):
    form = db.scalar(
        tenant_filter(select(CustomForm), CustomForm, tenant_id)
        .where(CustomForm.id == form_id)
    )
    if not form:
        raise HTTPException(404, "Form not found")

    if data.field_type not in FIELD_TYPES:
        raise HTTPException(400, f"Invalid field_type '{data.field_type}'. Must be one of: {', '.join(sorted(FIELD_TYPES))}")

    if data.field_type == "SELECT" and not data.options:
        raise HTTPException(400, "SELECT fields require at least one option")

    field = CustomFormField(
        form_id=form_id,
        field_type=data.field_type,
        label=data.label,
        required=data.required,
        placeholder=data.placeholder,
        options=data.options,
        validation_rules=data.validation_rules,
        sort_order=data.sort_order,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    log_form_field_create(db, user.id, field.id, {"form_id": form_id, "label": field.label, "field_type": field.field_type})
    return field


def list_form_fields(db: Session, form_id: int, tenant_id: int | None = None):
    form = db.scalar(
        tenant_filter(select(CustomForm), CustomForm, tenant_id)
        .where(CustomForm.id == form_id)
    )
    if not form:
        raise HTTPException(404, "Form not found")
    fields = db.execute(
        select(CustomFormField)
        .where(CustomFormField.form_id == form_id)
        .order_by(CustomFormField.sort_order)
    ).scalars().all()
    return fields


def get_form_field(db: Session, form_id: int, field_id: int, tenant_id: int | None = None):
    form = db.scalar(
        tenant_filter(select(CustomForm), CustomForm, tenant_id)
        .where(CustomForm.id == form_id)
    )
    if not form:
        raise HTTPException(404, "Form not found")
    field = db.get(CustomFormField, field_id)
    if not field or field.form_id != form_id:
        raise HTTPException(404, "Field not found")
    return field


@invalidate(patterns=["cf:list*"])
def update_form_field(db: Session, form_id: int, field_id: int, data, user, tenant_id: int | None = None):
    form = db.scalar(
        tenant_filter(select(CustomForm), CustomForm, tenant_id)
        .where(CustomForm.id == form_id)
    )
    if not form:
        raise HTTPException(404, "Form not found")
    field = db.get(CustomFormField, field_id)
    if not field or field.form_id != form_id:
        raise HTTPException(404, "Field not found")

    update_data = data.model_dump(exclude_unset=True)
    if "field_type" in update_data and update_data["field_type"] not in FIELD_TYPES:
        raise HTTPException(400, f"Invalid field_type. Must be one of: {', '.join(sorted(FIELD_TYPES))}")

    for key, val in update_data.items():
        if val is not None:
            setattr(field, key, val)
    db.commit()
    db.refresh(field)
    log_form_field_update(db, user.id, field_id, None, {"label": field.label})
    return field


@invalidate(patterns=["cf:list*"])
def delete_form_field(db: Session, form_id: int, field_id: int, user, tenant_id: int | None = None):
    form = db.scalar(
        tenant_filter(select(CustomForm), CustomForm, tenant_id)
        .where(CustomForm.id == form_id)
    )
    if not form:
        raise HTTPException(404, "Form not found")
    field = db.get(CustomFormField, field_id)
    if not field or field.form_id != form_id:
        raise HTTPException(404, "Field not found")
    db.delete(field)
    db.commit()
    log_form_field_delete(db, user.id, field_id, {"label": field.label})
    return {"message": "Field deleted"}


# ---------------------------------------------------------------------------
# Submissions
# ---------------------------------------------------------------------------

def submit_form(db: Session, form_id: int, data, user, tenant_id: int | None = None):
    form = get_form(db, form_id, tenant_id)
    if form["status"] != "active":
        raise HTTPException(400, "Form is not active")
    submission = FormSubmission(
        form_id=form_id,
        submitted_by=user.id,
        data=data.data,
        tenant_id=tenant_id,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    log_form_submission(db, user.id, submission.id, form_id, tenant_id)
    return submission


def get_submissions(db: Session, form_id: int, tenant_id: int | None = None, page: int = 1, size: int = 20):
    form = db.scalar(
        tenant_filter(select(CustomForm), CustomForm, tenant_id)
        .where(CustomForm.id == form_id)
    )
    if not form:
        raise HTTPException(404, "Form not found")
    query = tenant_filter(select(FormSubmission), FormSubmission, tenant_id).where(FormSubmission.form_id == form_id)
    query = query.order_by(FormSubmission.created_at.desc())
    return paginate(db, query)
