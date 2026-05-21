from typing import Optional
from app.models.subscription import PlanTier

TIER_ORDER: dict[str, int] = {"basic": 1, "silver": 2, "gold": 3}

FeatureName = str


class Feature:
    def __init__(
        self,
        name: str,
        required_tier: str,
        label: str,
        description: str,
        action: Optional[str] = None,
    ):
        self.name = name
        self.required_tier = required_tier
        self.required_level = TIER_ORDER[required_tier]
        self.label = label
        self.description = description
        self.action = action


class FeatureRegistry:
    _features: dict[str, Feature] = {}

    @classmethod
    def register(cls, feature: Feature) -> None:
        cls._features[feature.name] = feature

    @classmethod
    def get(cls, name: str) -> Optional[Feature]:
        return cls._features.get(name)

    @classmethod
    def all(cls) -> dict[str, Feature]:
        return dict(cls._features)

    @classmethod
    def features_for_tier(cls, tier: str) -> list[str]:
        level = TIER_ORDER.get(tier, 0)
        return [name for name, f in cls._features.items() if f.required_level <= level]


def _register(feature_name: str, tier: str, label: str, desc: str, action: Optional[str] = None) -> Feature:
    f = Feature(feature_name, tier, label, desc, action)
    FeatureRegistry.register(f)
    return f


_register("analytics", "silver", "Dashboard Analytics",
          "Access to analytics dashboards and visualizations")
_register("advanced_analytics", "gold", "Advanced Analytics",
          "Predictive analytics, trend analysis, custom reports")
_register("approvals", "silver", "Approval Workflows",
          "Multi-level approval workflows and request management")
_register("ai_intelligence", "gold", "AI Intelligence",
          "AI-powered suggestions, recommendations, and insights")
_register("ai_scheduling", "gold", "AI Scheduling",
          "Automated AI cache warming and scheduled analysis")
_register("realtime_collaboration", "gold", "Real-time Collaboration",
          "WebSocket-based real-time updates and collaboration")
_register("api_access", "silver", "API Access",
          "External API access and integrations")
_register("audit_trail", "silver", "Audit Trail",
          "Comprehensive audit logging and export")
_register("custom_branding", "gold", "Custom Branding",
          "Custom logos, colors, and domain branding")
_register("priority_support", "gold", "Priority Support",
          "SLA-backed priority support with dedicated channel")
_register("sla", "gold", "Service Level Agreement",
          "Guaranteed uptime and response time SLA")
_register("kanban_board", "basic", "Kanban Board",
          "Visual kanban board for task management")
_register("document_management", "basic", "Document Management",
          "File upload, versioning, and document storage")
_register("task_comments", "basic", "Task Comments",
          "Internal and external comments on tasks")
_register("leave_management", "basic", "Leave Management",
          "Leave requests and approval tracking")
_register("user_management", "silver", "User Management",
          "Bulk user operations and role management")
_register("data_export", "silver", "Data Export",
          "Export data in CSV, JSON, and PDF formats")
_register("performance_analytics", "gold", "Performance Analytics",
          "Employee performance metrics and productivity analysis")
_register("team_intelligence", "gold", "Team Intelligence",
          "Cross-team workload analysis and capacity planning")
_register("delay_prediction", "gold", "Delay Prediction",
          "AI-driven delay risk prediction and mitigation")
_register("workload_analysis", "gold", "Workload Analysis",
          "Team workload balancing and redistribution suggestions")
