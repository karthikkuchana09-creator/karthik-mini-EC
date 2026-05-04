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
