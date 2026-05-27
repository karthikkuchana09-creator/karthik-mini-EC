from contextvars import ContextVar
from typing import Optional
from uuid import uuid4


class AuditContext:
    __slots__ = (
        "correlation_id", "trace_id", "ip_address",
        "user_agent", "user_id", "tenant_id", "request_path",
    )

    def __init__(
        self,
        correlation_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        user_id: Optional[int] = None,
        tenant_id: Optional[int] = None,
        request_path: Optional[str] = None,
    ):
        self.correlation_id = correlation_id or str(uuid4())
        self.trace_id = trace_id or str(uuid4())
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.request_path = request_path

    def to_dict(self) -> dict:
        return {
            "correlation_id": self.correlation_id,
            "trace_id": self.trace_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "user_id": self.user_id,
            "tenant_id": self.tenant_id,
            "request_path": self.request_path,
        }


_audit_context: ContextVar[AuditContext] = ContextVar("audit_context", default=AuditContext())


def get_audit_context() -> AuditContext:
    return _audit_context.get()


def set_audit_context(ctx: AuditContext) -> None:
    _audit_context.set(ctx)


def reset_audit_context() -> None:
    _audit_context.set(AuditContext())


def generate_correlation_id() -> str:
    return str(uuid4())
