from .knowledge_base import router as knowledge_base_router
from .custom_forms import router as custom_forms_router
from .workflows import router as workflows_router
from .search import router as search_router
from .reports import router as reports_router
from .notification_rules import router as notification_rules_router
from .saved_searches import router as saved_searches_router
from .analytics import router as analytics_router

__all__ = [
    "knowledge_base_router",
    "custom_forms_router",
    "workflows_router",
    "search_router",
    "reports_router",
    "notification_rules_router",
    "saved_searches_router",
    "analytics_router",
]
