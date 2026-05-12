from app.services.auth_service import register_user, login_user, get_current_user_info
from app.services.task_service import (
    create_task,
    get_tasks,
    get_kanban_view,
    get_task_by_id,
    update_task,
    delete_task,
    assign_task,
    update_task_status
)
from app.services.user_service import get_all_users, get_user_by_id
from app.services.comment_service import add_comment, get_comments
from app.services.approval_service import (
    create_approval,
    get_approvals,
    take_approval_action,
    get_approval_history
)
from app.services.dashboard_service import (
    get_summary,
    get_task_distribution,
    get_approval_stats,
    get_performance
)
from app.services.document_service import upload_document, get_documents, get_document, get_task_documents, get_document_versions, download_document, delete_document
from app.services.audit_log_service import log_action, get_audit_logs, get_audit_logs_by_entity
from app.services.notification_service import (
    create_notification,
    get_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
    delete_notification,
)
from app.services.ai_service import generate_suggestion, generate_ai_summary, get_ai_history
