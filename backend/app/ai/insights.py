from typing import Optional
from app.ai.rules import Severity, InsightType, RulesEngine


class RecommendationBuilder:
    @staticmethod
    def build(severity: Severity, message: str, action: Optional[str] = None) -> dict:
        return {
            "severity": severity.value,
            "message": message,
            "action": action,
        }


class InsightGenerator:
    def __init__(self, rules: RulesEngine):
        self.rules = rules

    def high_priority_pending(self, count: int, tasks: list[dict]) -> tuple[list[dict], list[dict]]:
        if count == 0:
            return [], []
        rule = self.rules.get_rule("high_priority_pending")
        severity = self.rules.severity_for_count("high_priority_pending", count)
        insights = [{
            "type": InsightType.WARNING.value,
            "severity": severity.value,
            "text": f"{count} high priority task{'s' if count != 1 else ''} pending.",
        }]
        recommendations = []
        for t in tasks[:5]:
            assignee = t.get("assignee_name") or t.get("assignee") or "unassigned"
            recommendations.append(
                RecommendationBuilder.build(
                    Severity.HIGH,
                    f"High priority task \"{t['title']}\" ({t['status']}) assigned to {assignee}.",
                    f"Review and prioritize task #{t['id']}",
                )
            )
        return insights, recommendations

    def overdue_tasks(self, count: int, tasks: list[dict]) -> tuple[list[dict], list[dict]]:
        if count == 0:
            return [], []
        rule = self.rules.get_rule("overdue_tasks")
        severity = self.rules.severity_for_count("overdue_tasks", count)
        insights = [{
            "type": InsightType.WARNING.value,
            "severity": severity.value,
            "text": f"{count} task{'s' if count != 1 else ''} overdue.",
        }]
        recommendations = []
        for t in tasks[:5]:
            days = t.get("days_late", 0)
            assignee = t.get("assignee_name") or t.get("assignee") or "unassigned"
            sev = Severity.HIGH if days > 7 else Severity.MEDIUM
            recommendations.append(
                RecommendationBuilder.build(
                    sev,
                    f"\"{t['title']}\" is {days} day{'s' if days != 1 else ''} overdue, assigned to {assignee}.",
                    f"Reassign or reprioritize task #{t['id']}",
                )
            )
        return insights, recommendations

    def at_risk_tasks(self, count: int, tasks: list[dict]) -> tuple[list[dict], list[dict]]:
        if count == 0:
            return [], []
        severity = Severity.HIGH if count > 5 else Severity.MEDIUM
        insights = [{
            "type": InsightType.WARNING.value,
            "severity": severity.value,
            "text": f"{count} task{'s' if count != 1 else ''} at risk of missing deadline.",
        }]
        recommendations = []
        for t in tasks[:5]:
            remaining = t.get("days_remaining", 0)
            assignee = t.get("assignee") or "unassigned"
            recommendations.append(
                RecommendationBuilder.build(
                    Severity.MEDIUM,
                    f"\"{t['title']}\" due in {remaining} day{'s' if remaining != 1 else ''} — assigned to {assignee}.",
                    f"Expedite task #{t['id']} to meet deadline",
                )
            )
        return insights, recommendations

    def blocked_workflows(self, count: int, tasks: list[dict]) -> tuple[list[dict], list[dict]]:
        if count == 0:
            return [], []
        severity = Severity.HIGH if count > 3 else Severity.MEDIUM
        insights = [{
            "type": InsightType.WARNING.value,
            "severity": severity.value,
            "text": f"{count} task{'s' if count != 1 else ''} blocked — no updates in 24+ hours.",
        }]
        recommendations = []
        for t in tasks[:5]:
            hours = t.get("stalled_hours", 0)
            assignee = t.get("assignee") or "unassigned"
            recommendations.append(
                RecommendationBuilder.build(
                    Severity.MEDIUM,
                    f"Task \"{t['title']}\" stalled for {hours}h, assigned to {assignee}.",
                    f"Follow up on task #{t['id']}",
                )
            )
        return insights, recommendations

    def overloaded_employees(self, overloaded: dict, critical: dict, user_details: dict) -> tuple[list[dict], list[dict]]:
        insights = []
        recommendations = []

        for uid, cnt in critical.items():
            u = user_details.get(uid, {})
            name = u.get("name") or u.get("email") or f"User #{uid}"
            insights.append({
                "type": InsightType.WARNING.value,
                "severity": Severity.CRITICAL.value,
                "text": f"{name} has {cnt} active tasks — workload is critical.",
            })
            recommendations.append(
                RecommendationBuilder.build(
                    Severity.CRITICAL,
                    f"{name} is critically overloaded with {cnt} active tasks.",
                    f"Redistribute tasks from user #{uid}",
                )
            )

        for uid, cnt in overloaded.items():
            if uid in critical:
                continue
            u = user_details.get(uid, {})
            name = u.get("name") or u.get("email") or f"User #{uid}"
            insights.append({
                "type": InsightType.WARNING.value,
                "severity": Severity.HIGH.value,
                "text": f"{name} has {cnt} active tasks — workload is high.",
            })
            recommendations.append(
                RecommendationBuilder.build(
                    Severity.HIGH,
                    f"{name} workload is high with {cnt} active tasks.",
                    f"Consider reassigning tasks from user #{uid}",
                )
            )

        return insights, recommendations

    def lightly_loaded(self, lightly_loaded: dict, user_details: dict, total_tasks: int) -> list[dict]:
        if not lightly_loaded or total_tasks <= 5:
            return []
        insights = []
        for uid, cnt in list(lightly_loaded.items())[:3]:
            u = user_details.get(uid, {})
            name = u.get("name") or u.get("email") or f"User #{uid}"
            insights.append({
                "type": InsightType.POSITIVE.value,
                "severity": Severity.LOW.value,
                "text": f"{name} has only {cnt} active task{'s' if cnt != 1 else ''} — available for assignments.",
            })
        return insights

    def approval_bottlenecks(self, delayed_count: int, pending_count: int, delayed: list[dict]) -> tuple[list[dict], list[dict]]:
        insights = []
        recommendations = []

        if delayed_count > 0:
            rule = self.rules.get_rule("approval_bottleneck")
            severity = self.rules.severity_for_count("approval_bottleneck", delayed_count)
            insights.append({
                "type": InsightType.WARNING.value,
                "severity": severity.value,
                "text": f"{delayed_count} approval{'s' if delayed_count != 1 else ''} delayed beyond {self.rules.approval_delay_hours}h.",
            })
            for a in delayed[:5]:
                hours = a.get("wait_hours", 0)
                requester = a.get("requester") or "unknown"
                sev = Severity.HIGH if hours > 72 else Severity.MEDIUM
                recommendations.append(
                    RecommendationBuilder.build(
                        sev,
                        f"Approval \"{a['title']}\" requested by {requester} has been waiting {hours}h.",
                        f"Review approval request #{a['id']}",
                    )
                )
        elif pending_count > 0:
            insights.append({
                "type": InsightType.INFO.value,
                "severity": Severity.LOW.value,
                "text": f"{pending_count} approval{'s' if pending_count != 1 else ''} pending.",
            })

        return insights, recommendations

    def due_today(self, count: int) -> list[dict]:
        if count == 0:
            return []
        return [{
            "type": InsightType.INFO.value,
            "severity": Severity.MEDIUM.value,
            "text": f"{count} task{'s' if count != 1 else ''} due today.",
        }]

    def weekly_completion(self, count: int) -> list[dict]:
        if count == 0:
            return []
        return [{
            "type": InsightType.POSITIVE.value,
            "severity": Severity.LOW.value,
            "text": f"{count} task{'s' if count != 1 else ''} completed this week.",
        }]

    def build_summary(self, task_result, approval_result, stats: dict) -> str:
        parts = []
        if task_result.total == 0:
            parts.append("No tasks found.")
        else:
            parts.append(
                f"You have {task_result.total} total task{'s' if task_result.total != 1 else ''} "
                f"({task_result.completed} completed, {task_result.pending} pending)."
            )
            if task_result.high_priority_pending > 0:
                parts.append(
                    f"{task_result.high_priority_pending} high priority task{'s' if task_result.high_priority_pending != 1 else ''} "
                    f"need{'s' if task_result.high_priority_pending == 1 else ''} immediate attention."
                )
            if task_result.overdue > 0:
                parts.append(f"{task_result.overdue} task{'s' if task_result.overdue != 1 else ''} are overdue.")
            if task_result.due_today > 0:
                parts.append(f"{task_result.due_today} task{'s' if task_result.due_today != 1 else ''} due today.")
            if task_result.completed_week > 0:
                parts.append(f"{task_result.completed_week} completed this week.")
            if approval_result.pending > 0:
                parts.append(f"{approval_result.pending} approval{'s' if approval_result.pending != 1 else ''} pending review.")

        return " ".join(parts)
