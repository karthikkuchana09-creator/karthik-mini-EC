import contextvars
from contextlib import contextmanager
from typing import Optional
from app.core.log import get_logger

logger = get_logger("tenant_context")

tenant_context_var: contextvars.ContextVar[Optional[int]] = contextvars.ContextVar("tenant_context", default=None)
tenant_slug_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("tenant_slug", default=None)


def get_context_tenant_id() -> Optional[int]:
    return tenant_context_var.get()


def get_context_tenant_slug() -> Optional[str]:
    return tenant_slug_var.get()


def set_context_tenant(tenant_id: int, tenant_slug: str = "") -> None:
    tenant_context_var.set(tenant_id)
    if tenant_slug:
        tenant_slug_var.set(tenant_slug)
    logger.debug("Tenant context set to id=%s slug='%s'", tenant_id, tenant_slug)


def clear_context_tenant() -> None:
    tenant_context_var.set(None)
    tenant_slug_var.set(None)
    logger.debug("Tenant context cleared")


@contextmanager
def tenant_context(tenant_id: Optional[int], tenant_slug: str = ""):
    token_id = tenant_context_var.set(tenant_id)
    token_slug = tenant_slug_var.set(tenant_slug) if tenant_slug else None
    try:
        yield
    finally:
        tenant_context_var.reset(token_id)
        if token_slug is not None:
            tenant_slug_var.reset(token_slug)
