"""
Enterprise audit service.

Centralizes all audit logging with automatic context enrichment
(trace_id, correlation_id, IP, user_agent from the request context).
Provides typed methods per module for consistency.
"""
from typing import Optional, Any
from sqlalchemy.orm import Session

from app.core.audit_context import get_audit_context
from app.services.audit_log_service import log_action
from app.core.log import get_logger

logger = get_logger("enterprise_audit")


def _enrich(kw: dict) -> dict:
    ctx = get_audit_context()
    kw.setdefault("ip_address", ctx.ip_address)
    kw.setdefault("user_agent", ctx.user_agent)
    meta = kw.get("metadata") or {}
    meta["correlation_id"] = ctx.correlation_id
    meta["trace_id"] = ctx.trace_id
    kw["metadata"] = meta
    return kw


# ── Task ────────────────────────────────────────────────────────────

def log_task_create(db: Session, user_id: int, task_id: int, task_data: dict) -> None:
    log_action(db, user_id, "create", "task", task_id,
               new_value=task_data, new_data=task_data,
               module_name="task", action_type="create", record_id=task_id,
               **_enrich({}))


def log_task_update(db: Session, user_id: int, task_id: int,
                    old: Optional[dict], new: Optional[dict]) -> None:
    log_action(db, user_id, "update", "task", task_id,
               old_value=old, new_value=new,
               old_data=old, new_data=new,
               module_name="task", action_type="update", record_id=task_id,
               **_enrich({}))


def log_task_delete(db: Session, user_id: int, task_id: int, data: dict) -> None:
    log_action(db, user_id, "delete", "task", task_id,
               old_value=data, old_data=data,
               module_name="task", action_type="delete", record_id=task_id,
               **_enrich({}))


def log_task_assign(db: Session, user_id: int, task_id: int,
                    old_assignee: Optional[int], new_assignee: int) -> None:
    log_action(db, user_id, "assign", "task", task_id,
               old_value={"assigned_to_id": old_assignee},
               new_value={"assigned_to_id": new_assignee},
               old_data={"assigned_to_id": old_assignee},
               new_data={"assigned_to_id": new_assignee},
               module_name="task", action_type="assign", record_id=task_id,
               **_enrich({}))


def log_task_status_change(db: Session, user_id: int, task_id: int,
                           old_status: str, new_status: str) -> None:
    log_action(db, user_id, "status_update", "task", task_id,
               old_value={"status": old_status}, new_value={"status": new_status},
               old_data={"status": old_status}, new_data={"status": new_status},
               module_name="task", action_type="status_change", record_id=task_id,
               **_enrich({}))


# ── Approval ────────────────────────────────────────────────────────

def log_approval_create(db: Session, user_id: int, approval_id: int, data: dict) -> None:
    log_action(db, user_id, "create", "approval", approval_id,
               new_value=data, new_data=data,
               module_name="approval", action_type="create", record_id=approval_id,
               **_enrich({}))


def log_approval_action(db: Session, user_id: int, approval_id: int,
                        action: str, old: dict, new: dict) -> None:
    log_action(db, user_id, action, "approval", approval_id,
               old_value=old, new_value=new,
               old_data=old, new_data=new,
               module_name="approval", action_type=action, record_id=approval_id,
               **_enrich({}))


def log_approval_escalate(db: Session, user_id: int, approval_id: int,
                          escalation_id: int, escalated_to: int, level: str) -> None:
    log_action(db, user_id, "escalate", "approval", approval_id,
               new_value={"escalation_id": escalation_id, "escalated_to": escalated_to, "level": level},
               new_data={"escalation_id": escalation_id, "escalated_to": escalated_to, "level": level},
               module_name="escalation", action_type="escalate", record_id=escalation_id,
               **_enrich({}))


def log_approval_escalation_resolve(db: Session, user_id: int, approval_id: int,
                                     escalation_id: int) -> None:
    log_action(db, user_id, "resolve", "approval", approval_id,
               new_value={"escalation_id": escalation_id, "status": "resolved"},
               new_data={"escalation_id": escalation_id, "status": "resolved"},
               module_name="escalation", action_type="resolve", record_id=escalation_id,
               **_enrich({}))


def log_approval_escalation_cancel(db: Session, user_id: int, approval_id: int,
                                    escalation_id: int) -> None:
    log_action(db, user_id, "cancel", "approval", approval_id,
               new_value={"escalation_id": escalation_id, "status": "cancelled"},
               new_data={"escalation_id": escalation_id, "status": "cancelled"},
               module_name="escalation", action_type="cancel", record_id=escalation_id,
               **_enrich({}))


# ── Delegation ──────────────────────────────────────────────────────

def log_delegation_create(db: Session, user_id: int, delegation_id: int,
                           delegator_id: int, delegatee_id: int) -> None:
    log_action(db, user_id, "create", "delegation", delegation_id,
               new_value={"delegator_id": delegator_id, "delegatee_id": delegatee_id},
               new_data={"delegator_id": delegator_id, "delegatee_id": delegatee_id},
               module_name="delegation", action_type="create", record_id=delegation_id,
               **_enrich({}))


def log_delegation_cancel(db: Session, user_id: int, delegation_id: int) -> None:
    log_action(db, user_id, "cancel", "delegation", delegation_id,
               old_value={"is_active": True}, new_value={"is_active": False},
               old_data={"is_active": True}, new_data={"is_active": False},
               module_name="delegation", action_type="cancel", record_id=delegation_id,
               **_enrich({}))


# ── SLA ─────────────────────────────────────────────────────────────

def log_sla_start(db: Session, tracking_id: int, module_name: str,
                   record_id: int, due_time: str) -> None:
    log_action(db, None, "start", "sla", tracking_id,
               new_value={"module_name": module_name, "record_id": record_id, "due_time": due_time},
               new_data={"module_name": module_name, "record_id": record_id, "due_time": due_time},
               module_name="sla", action_type="start", record_id=tracking_id,
               **_enrich({}))


def log_sla_complete(db: Session, tracking_id: int, breach_reason: Optional[str] = None) -> None:
    log_action(db, None, "complete", "sla", tracking_id,
               new_value={"status": "completed", "breach_reason": breach_reason},
               new_data={"status": "completed", "breach_reason": breach_reason},
               module_name="sla", action_type="complete", record_id=tracking_id,
               **_enrich({}))


def log_sla_breach(db: Session, tracking_id: int, module_name: str,
                    record_id: int, reason: str) -> None:
    log_action(db, None, "breach", "sla", tracking_id,
               new_value={"module_name": module_name, "record_id": record_id, "reason": reason},
               new_data={"module_name": module_name, "record_id": record_id, "reason": reason},
               module_name="sla", action_type="breach", record_id=tracking_id,
               **_enrich({}))


# ── Document ────────────────────────────────────────────────────────

def log_document_upload(db: Session, user_id: int, document_id: int,
                         filename: str, task_id: Optional[int] = None) -> None:
    log_action(db, user_id, "create", "document", document_id,
               new_value={"filename": filename, "task_id": task_id},
               new_data={"filename": filename, "task_id": task_id},
               module_name="document", action_type="upload", record_id=document_id,
               **_enrich({}))


def log_document_delete(db: Session, user_id: int, document_id: int,
                         filename: str) -> None:
    log_action(db, user_id, "delete", "document", document_id,
               old_value={"filename": filename},
               old_data={"filename": filename},
               module_name="document", action_type="delete", record_id=document_id,
               **_enrich({}))


# ── Auth ────────────────────────────────────────────────────────────

def log_auth_login(db: Session, user_id: int, email: str,
                    provider: str = "email") -> None:
    log_action(db, user_id, "login", "auth", user_id,
               new_value={"email": email, "provider": provider},
               new_data={"email": email, "provider": provider},
               module_name="auth", action_type="login", record_id=user_id,
               **_enrich({}))


def log_auth_logout(db: Session, user_id: int) -> None:
    log_action(db, user_id, "logout", "auth", user_id,
               module_name="auth", action_type="logout", record_id=user_id,
               **_enrich({}))


def log_auth_failed(db: Session, email: str, reason: str) -> None:
    log_action(db, None, "login_failed", "auth", None,
               new_value={"email": email, "reason": reason},
               new_data={"email": email, "reason": reason},
               module_name="auth", action_type="login_failed",
               **_enrich({}))


# ── Comment ─────────────────────────────────────────────────────────

def log_comment_create(db: Session, user_id: int, comment_id: int,
                        task_id: int, is_internal: bool = False) -> None:
    log_action(db, user_id, "create", "comment", comment_id,
               new_value={"task_id": task_id, "is_internal": is_internal},
               new_data={"task_id": task_id, "is_internal": is_internal},
               module_name="comment", action_type="create", record_id=comment_id,
               **_enrich({}))


def log_comment_delete(db: Session, user_id: int, task_id: int, count: int) -> None:
    log_action(db, user_id, "delete", "comment", task_id,
               old_value={"task_id": task_id, "count": count},
               old_data={"task_id": task_id, "count": count},
               module_name="comment", action_type="delete", record_id=task_id,
               **_enrich({}))


# ── Knowledge Base ───────────────────────────────────────────────────

def log_kb_category_create(db: Session, user_id: int, category_id: int, data: dict) -> None:
    log_action(db, user_id, "create", "knowledge_category", category_id,
               new_value=data, new_data=data,
               module_name="knowledge_base", action_type="create", record_id=category_id,
               **_enrich({}))


def log_kb_category_update(db: Session, user_id: int, category_id: int,
                           old: Optional[dict], new: Optional[dict]) -> None:
    log_action(db, user_id, "update", "knowledge_category", category_id,
               old_value=old, new_value=new,
               old_data=old, new_data=new,
               module_name="knowledge_base", action_type="update", record_id=category_id,
               **_enrich({}))


def log_kb_category_delete(db: Session, user_id: int, category_id: int, data: dict) -> None:
    log_action(db, user_id, "delete", "knowledge_category", category_id,
               old_value=data, old_data=data,
               module_name="knowledge_base", action_type="delete", record_id=category_id,
               **_enrich({}))


def log_kb_article_create(db: Session, user_id: int, article_id: int, data: dict) -> None:
    log_action(db, user_id, "create", "knowledge_article", article_id,
               new_value=data, new_data=data,
               module_name="knowledge_base", action_type="create", record_id=article_id,
               **_enrich({}))


def log_kb_article_update(db: Session, user_id: int, article_id: int,
                          old: Optional[dict], new: Optional[dict]) -> None:
    log_action(db, user_id, "update", "knowledge_article", article_id,
               old_value=old, new_value=new,
               old_data=old, new_data=new,
               module_name="knowledge_base", action_type="update", record_id=article_id,
               **_enrich({}))


def log_kb_article_delete(db: Session, user_id: int, article_id: int, data: dict) -> None:
    log_action(db, user_id, "delete", "knowledge_article", article_id,
               old_value=data, old_data=data,
               module_name="knowledge_base", action_type="delete", record_id=article_id,
               **_enrich({}))


def log_kb_article_restore(db: Session, user_id: int, article_id: int,
                           version_number: int, data: dict) -> None:
    log_action(db, user_id, "restore", "knowledge_article", article_id,
               new_value={**data, "restored_from_version": version_number},
               new_data={**data, "restored_from_version": version_number},
               module_name="knowledge_base", action_type="restore", record_id=article_id,
               **_enrich({}))


# ── Custom Forms ─────────────────────────────────────────────────────

def log_form_create(db: Session, user_id: int, form_id: int, data: dict) -> None:
    log_action(db, user_id, "create", "custom_form", form_id,
               new_value=data, new_data=data,
               module_name="custom_form", action_type="create", record_id=form_id,
               **_enrich({}))


def log_form_update(db: Session, user_id: int, form_id: int,
                    old: Optional[dict], new: Optional[dict]) -> None:
    log_action(db, user_id, "update", "custom_form", form_id,
               old_value=old, new_value=new,
               old_data=old, new_data=new,
               module_name="custom_form", action_type="update", record_id=form_id,
               **_enrich({}))


def log_form_delete(db: Session, user_id: int, form_id: int, data: dict) -> None:
    log_action(db, user_id, "delete", "custom_form", form_id,
               old_value=data, old_data=data,
               module_name="custom_form", action_type="delete", record_id=form_id,
               **_enrich({}))


def log_form_field_create(db: Session, user_id: int, field_id: int, data: dict) -> None:
    log_action(db, user_id, "create", "custom_form_field", field_id,
               new_value=data, new_data=data,
               module_name="custom_form", action_type="create", record_id=field_id,
               **_enrich({}))


def log_form_field_update(db: Session, user_id: int, field_id: int,
                          old: Optional[dict], new: Optional[dict]) -> None:
    log_action(db, user_id, "update", "custom_form_field", field_id,
               old_value=old, new_value=new,
               old_data=old, new_data=new,
               module_name="custom_form", action_type="update", record_id=field_id,
               **_enrich({}))


def log_form_field_delete(db: Session, user_id: int, field_id: int, data: dict) -> None:
    log_action(db, user_id, "delete", "custom_form_field", field_id,
               old_value=data, old_data=data,
               module_name="custom_form", action_type="delete", record_id=field_id,
               **_enrich({}))


# ── Workflow Automation ──────────────────────────────────────────────

def log_workflow_create(db: Session, user_id: int, workflow_id: int, data: dict) -> None:
    log_action(db, user_id, "create", "workflow", workflow_id,
               new_value=data, new_data=data,
               module_name="workflow", action_type="create", record_id=workflow_id,
               **_enrich({}))


def log_workflow_update(db: Session, user_id: int, workflow_id: int,
                        old: Optional[dict], new: Optional[dict]) -> None:
    log_action(db, user_id, "update", "workflow", workflow_id,
               old_value=old, new_value=new,
               old_data=old, new_data=new,
               module_name="workflow", action_type="update", record_id=workflow_id,
               **_enrich({}))


def log_workflow_delete(db: Session, user_id: int, workflow_id: int, data: dict) -> None:
    log_action(db, user_id, "delete", "workflow", workflow_id,
               old_value=data, old_data=data,
               module_name="workflow", action_type="delete", record_id=workflow_id,
               **_enrich({}))


def log_workflow_rule_create(db: Session, user_id: int, rule_id: int, data: dict) -> None:
    log_action(db, user_id, "create", "workflow_rule", rule_id,
               new_value=data, new_data=data,
               module_name="workflow", action_type="create", record_id=rule_id,
               **_enrich({}))


def log_workflow_rule_update(db: Session, user_id: int, rule_id: int,
                             old: Optional[dict], new: Optional[dict]) -> None:
    log_action(db, user_id, "update", "workflow_rule", rule_id,
               old_value=old, new_value=new,
               old_data=old, new_data=new,
               module_name="workflow", action_type="update", record_id=rule_id,
               **_enrich({}))


def log_workflow_rule_delete(db: Session, user_id: int, rule_id: int, data: dict) -> None:
    log_action(db, user_id, "delete", "workflow_rule", rule_id,
               old_value=data, old_data=data,
               module_name="workflow", action_type="delete", record_id=rule_id,
               **_enrich({}))


def log_workflow_execution(db: Session, user_id: int, execution_id: int,
                           workflow_id: int, status: str, data: dict) -> None:
    log_action(db, user_id, "execute", "workflow_execution", execution_id,
               new_value={"workflow_id": workflow_id, "status": status, **data},
               new_data={"workflow_id": workflow_id, "status": status, **data},
               module_name="workflow", action_type=status, record_id=execution_id,
               **_enrich({}))


# ── Notification Rules ───────────────────────────────────────────────

def log_notification_rule_create(db: Session, user_id: int, rule_id: int, data: dict) -> None:
    log_action(db, user_id, "create", "notification_rule", rule_id,
               new_value=data, new_data=data,
               module_name="notification_rule", action_type="create", record_id=rule_id,
               **_enrich({}))


def log_notification_rule_update(db: Session, user_id: int, rule_id: int,
                                 old: Optional[dict], new: Optional[dict]) -> None:
    log_action(db, user_id, "update", "notification_rule", rule_id,
               old_value=old, new_value=new,
               old_data=old, new_data=new,
               module_name="notification_rule", action_type="update", record_id=rule_id,
               **_enrich({}))


def log_notification_rule_delete(db: Session, user_id: int, rule_id: int, data: dict) -> None:
    log_action(db, user_id, "delete", "notification_rule", rule_id,
               old_value=data, old_data=data,
               module_name="notification_rule", action_type="delete", record_id=rule_id,
               **_enrich({}))


# ── Reports ──────────────────────────────────────────────────────────

def log_report_create(db: Session, user_id: int, report_id: int, data: dict) -> None:
    log_action(db, user_id, "create", "report", report_id,
               new_value=data, new_data=data,
               module_name="report", action_type="create", record_id=report_id,
               **_enrich({}))


def log_report_update(db: Session, user_id: int, report_id: int,
                      old: Optional[dict], new: Optional[dict]) -> None:
    log_action(db, user_id, "update", "report", report_id,
               old_value=old, new_value=new,
               old_data=old, new_data=new,
               module_name="report", action_type="update", record_id=report_id,
               **_enrich({}))


def log_report_delete(db: Session, user_id: int, report_id: int, data: dict) -> None:
    log_action(db, user_id, "delete", "report", report_id,
               old_value=data, old_data=data,
               module_name="report", action_type="delete", record_id=report_id,
               **_enrich({}))


def log_report_execute(db: Session, user_id: int, report_id: int,
                       entity_type: str, result_summary: dict) -> None:
    log_action(db, user_id, "execute", "report", report_id,
               new_value={"entity_type": entity_type, **result_summary},
               new_data={"entity_type": entity_type, **result_summary},
               module_name="report", action_type="execute", record_id=report_id,
               **_enrich({}))


# ── Search ───────────────────────────────────────────────────────────

def log_search(db: Session, user_id: int, query: str, entity_types: list[str],
               result_count: int, tenant_id: Optional[int] = None) -> None:
    log_action(db, user_id, "search", "search", None,
               new_value={"query": query, "entity_types": entity_types, "result_count": result_count},
               new_data={"query": query, "entity_types": entity_types, "result_count": result_count},
               module_name="search", action_type="query", record_id=None,
               **_enrich({}))


# ── Analytics ────────────────────────────────────────────────────────

def log_analytics_request(db: Session, user_id: int, analytics_type: str,
                          filters: Optional[dict] = None) -> None:
    log_action(db, user_id, "view", "analytics", None,
               new_value={"analytics_type": analytics_type, "filters": filters},
               new_data={"analytics_type": analytics_type, "filters": filters},
               module_name="analytics", action_type="view", record_id=None,
               **_enrich({}))


# ── Saved Searches ───────────────────────────────────────────────────

def log_saved_search_create(db: Session, user_id: int, search_id: int, data: dict) -> None:
    log_action(db, user_id, "create", "saved_search", search_id,
               new_value=data, new_data=data,
               module_name="saved_search", action_type="create", record_id=search_id,
               **_enrich({}))


def log_saved_search_delete(db: Session, user_id: int, search_id: int, data: dict) -> None:
    log_action(db, user_id, "delete", "saved_search", search_id,
               old_value=data, old_data=data,
               module_name="saved_search", action_type="delete", record_id=search_id,
               **_enrich({}))


# ── Form Submissions ─────────────────────────────────────────────────

def log_form_submission(db: Session, user_id: int, submission_id: int,
                        form_id: int, tenant_id: Optional[int] = None) -> None:
    log_action(db, user_id, "submit", "form_submission", submission_id,
               new_value={"form_id": form_id},
               new_data={"form_id": form_id},
               module_name="custom_form", action_type="submit", record_id=submission_id,
               **_enrich({}))
