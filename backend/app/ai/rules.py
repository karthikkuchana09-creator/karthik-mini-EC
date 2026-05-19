from enum import Enum
from dataclasses import dataclass, field
from typing import Optional


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InsightType(str, Enum):
    WARNING = "warning"
    INFO = "info"
    POSITIVE = "positive"


@dataclass(frozen=True)
class Rule:
    name: str
    description: str
    insight_type: InsightType
    severity: Severity
    condition_expr: str = ""


@dataclass
class RulesEngine:
    overdue_hours: int = 2
    approval_delay_hours: int = 48
    workload_high: int = 5
    workload_critical: int = 10
    at_risk_days: int = 2
    blocked_hours: int = 24

    rules: list[Rule] = field(default_factory=list)

    def __post_init__(self):
        self.rules = self._default_rules()

    @staticmethod
    def _default_rules() -> list[Rule]:
        return [
            Rule(
                name="high_priority_pending",
                description="High priority tasks in todo/in_progress",
                insight_type=InsightType.WARNING,
                severity=Severity.HIGH,
            ),
            Rule(
                name="overdue_tasks",
                description="Tasks past due date and not done",
                insight_type=InsightType.WARNING,
                severity=Severity.HIGH,
            ),
            Rule(
                name="at_risk_delay",
                description="Tasks due within threshold with no progress",
                insight_type=InsightType.WARNING,
                severity=Severity.MEDIUM,
            ),
            Rule(
                name="blocked_workflow",
                description="Tasks stuck in same status beyond threshold",
                insight_type=InsightType.WARNING,
                severity=Severity.MEDIUM,
            ),
            Rule(
                name="overloaded_employee",
                description="Employees with excessive active tasks",
                insight_type=InsightType.WARNING,
                severity=Severity.HIGH,
            ),
            Rule(
                name="approval_bottleneck",
                description="Approvals pending beyond delay threshold",
                insight_type=InsightType.WARNING,
                severity=Severity.HIGH,
            ),
            Rule(
                name="due_today",
                description="Tasks due today not yet completed",
                insight_type=InsightType.INFO,
                severity=Severity.MEDIUM,
            ),
            Rule(
                name="weekly_completion",
                description="Tasks completed in the last 7 days",
                insight_type=InsightType.POSITIVE,
                severity=Severity.LOW,
            ),
            Rule(
                name="lightly_loaded",
                description="Employees available for assignments",
                insight_type=InsightType.POSITIVE,
                severity=Severity.LOW,
            ),
        ]

    def get_rule(self, name: str) -> Optional[Rule]:
        for rule in self.rules:
            if rule.name == name:
                return rule
        return None

    def severity_for_count(self, rule_name: str, count: int) -> Severity:
        thresholds = {
            "high_priority_pending": {3: Severity.MEDIUM, 6: Severity.HIGH, 10: Severity.CRITICAL},
            "overdue_tasks": {2: Severity.MEDIUM, 5: Severity.HIGH, 10: Severity.CRITICAL},
            "approval_bottleneck": {2: Severity.MEDIUM, 5: Severity.HIGH, 8: Severity.CRITICAL},
            "overloaded_employee": {1: Severity.HIGH, 3: Severity.CRITICAL},
        }
        levels = thresholds.get(rule_name, {})
        result = Severity.LOW
        for threshold, sev in sorted(levels.items()):
            if count >= threshold:
                result = sev
        return result
