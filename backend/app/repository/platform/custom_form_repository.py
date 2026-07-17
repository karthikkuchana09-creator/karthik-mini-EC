from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.platform.custom_form import CustomForm
from app.models.platform.form_submission import FormSubmission


def list_forms(db: Session, tenant_id: int | None = None):
    stmt = select(CustomForm)
    if tenant_id:
        stmt = stmt.where(CustomForm.tenant_id == tenant_id)
    return paginate(db, stmt)


def get_form(db: Session, form_id: int):
    return db.get(CustomForm, form_id)


def list_submissions(db: Session, form_id: int):
    stmt = select(FormSubmission).where(FormSubmission.form_id == form_id)
    return paginate(db, stmt)
