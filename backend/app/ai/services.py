from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.models.task import Task
from app.models.approval import Approval
from app.models.ai import AIAnalysis
from app.core.log import get_logger
from app.core.config import settings
from app.core.cache import cached
from app.ai.rules import RulesEngine
from app.ai.analyzers import TaskAnalyzer, ApprovalAnalyzer, WorkloadAnalyzer, DelayRiskAnalyzer, AssignmentRecommender, WorkloadAnalysisEngine, PerformanceAnalyzer, RecommendationEngine
from app.ai.insights import InsightGenerator
from app.schemas.ai import AIRequest

logger = get_logger("ai.service")


def _calculate_urgency(due_date, now):
    if due_date is None:
        return {"score": 0, "level": "low", "days_remaining": None}
    days_remaining = (due_date - now).days
    if days_remaining < 0:
        score = min(20, 10 + abs(days_remaining))
        return {"score": score, "level": "critical", "days_remaining": days_remaining}
    elif days_remaining <= 1:
        return {"score": 9, "level": "critical", "days_remaining": days_remaining}
    elif days_remaining <= 3:
        return {"score": 7, "level": "high", "days_remaining": days_remaining}
    elif days_remaining <= 7:
        return {"score": 4, "level": "medium", "days_remaining": days_remaining}
    else:
        return {"score": 2, "level": "low", "days_remaining": days_remaining}


def _task_base_query(db: Session, current_user):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    q = db.query(Task)
    if role == "admin":
        return q
    elif role == "manager":
        return q.filter(
            (Task.created_by_id == current_user.id) |
            (Task.assigned_to_id == current_user.id)
        )
    else:
        return q.filter(Task.assigned_to_id == current_user.id)


def _approval_base_query(db: Session, current_user):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    q = db.query(Approval)
    if role == "manager":
        return q.filter(Approval.current_level == "manager")
    return q


class AIService:
    def __init__(self, db: Session):
        self.db = db
        self.rules = RulesEngine()
        self.task_analyzer = TaskAnalyzer(db, self.rules)
        self.approval_analyzer = ApprovalAnalyzer(db, self.rules)
        self.workload_analyzer = WorkloadAnalyzer(db, self.rules)
        self.insight_generator = InsightGenerator(self.rules)

    @cached(prefix="ai:summary", ttl=lambda: settings.CACHE_TTL_AI, exclude_args=[0], exclude_kwargs=None)
    def generate_summary(self, current_user) -> dict:
        logger.info("Generating AI summary for user_id=%d role=%s", current_user.id, current_user.role)

        task_query = _task_base_query(self.db, current_user)
        approval_query = _approval_base_query(self.db, current_user)
        workload_query = task_query

        task_result = self.task_analyzer.analyze(task_query)
        approval_result = self.approval_analyzer.analyze(approval_query)
        workload_result = self.workload_analyzer.analyze(workload_query)

        insights = []
        recommendations = []

        hp_insights, hp_recs = self.insight_generator.high_priority_pending(
            task_result.high_priority_pending, task_result.high_priority_tasks,
        )
        insights.extend(hp_insights)
        recommendations.extend(hp_recs)

        od_insights, od_recs = self.insight_generator.overdue_tasks(
            task_result.overdue, task_result.overdue_tasks,
        )
        insights.extend(od_insights)
        recommendations.extend(od_recs)

        ar_insights, ar_recs = self.insight_generator.at_risk_tasks(
            task_result.at_risk, task_result.at_risk_tasks,
        )
        insights.extend(ar_insights)
        recommendations.extend(ar_recs)

        bl_insights, bl_recs = self.insight_generator.blocked_workflows(
            task_result.blocked, task_result.blocked_tasks,
        )
        insights.extend(bl_insights)
        recommendations.extend(bl_recs)

        ol_insights, ol_recs = self.insight_generator.overloaded_employees(
            workload_result.overloaded, workload_result.critical,
            workload_result.user_details,
        )
        insights.extend(ol_insights)
        recommendations.extend(ol_recs)

        ab_insights, ab_recs = self.insight_generator.approval_bottlenecks(
            approval_result.delayed, approval_result.pending,
            approval_result.delayed_approvals,
        )
        insights.extend(ab_insights)
        recommendations.extend(ab_recs)

        insights.extend(self.insight_generator.due_today(task_result.due_today))
        insights.extend(self.insight_generator.weekly_completion(task_result.completed_week))
        insights.extend(self.insight_generator.lightly_loaded(
            workload_result.lightly_loaded, workload_result.user_details, task_result.total,
        ))

        summary = self.insight_generator.build_summary(task_result, approval_result, {})

        stats = {
            "total_tasks": task_result.total,
            "pending": task_result.pending,
            "in_review": task_result.in_review,
            "completed": task_result.completed,
            "high_priority": task_result.high_priority_pending,
            "overdue": task_result.overdue,
            "due_today": task_result.due_today,
            "completed_this_week": task_result.completed_week,
            "at_risk": task_result.at_risk,
            "blocked": task_result.blocked,
            "total_approvals": approval_result.total,
            "pending_approvals": approval_result.pending,
            "approved_approvals": approval_result.approved,
            "rejected_approvals": approval_result.rejected,
            "delayed_approvals": approval_result.delayed,
            "status_distribution": task_result.status_distribution,
            "priority_distribution": task_result.priority_distribution,
        }

        logger.info(
            "AI summary generated: %d insights, %d recommendations",
            len(insights), len(recommendations),
        )

        return {
            "summary": summary,
            "stats": stats,
            "insights": insights,
            "recommendations": recommendations,
        }

    def generate_suggestion(self, request: AIRequest, current_user) -> dict:
        logger.info("AI suggestion requested by user_id=%d", current_user.id)

        if request.task_id:
            task = self.db.query(Task).filter(Task.id == request.task_id).first()
            if not task:
                from fastapi import HTTPException
                raise HTTPException(404, "Task not found")

        task_result = self.task_analyzer.analyze(_task_base_query(self.db, current_user))

        suggestion_parts = []
        if task_result.high_priority_pending > 0:
            suggestion_parts.append(f"{task_result.high_priority_pending} high priority tasks need attention.")
        if task_result.overdue > 0:
            suggestion_parts.append(f"{task_result.overdue} tasks are overdue.")
        if task_result.at_risk > 0:
            suggestion_parts.append(f"{task_result.at_risk} tasks at risk of missing deadlines.")
        if task_result.blocked > 0:
            suggestion_parts.append(f"{task_result.blocked} workflows appear blocked.")
        if task_result.completed_week > 0:
            suggestion_parts.append(f"Great progress — {task_result.completed_week} tasks completed this week.")

        if not suggestion_parts:
            suggestion = "All tasks are on track. Keep up the good work!"
        else:
            suggestion = " ".join(suggestion_parts)

        if request.context:
            suggestion = f"Context: {request.context}\n\n{suggestion}"

        analysis = AIAnalysis(
            user_id=current_user.id,
            task_id=request.task_id,
            prompt=request.prompt,
            response=suggestion,
            model_name="ai-engine",
            tokens_used=len(request.prompt.split()) + len(suggestion.split()),
        )
        self.db.add(analysis)
        self.db.commit()

        return {
            "suggestion": suggestion,
            "model_used": "ai-engine",
            "tokens_used": analysis.tokens_used,
        }

    def get_recommendations(self) -> dict:
        logger.info("Running unified recommendation engine")
        engine = RecommendationEngine(self.db, self.rules)
        recs = engine.generate()
        return {
            "total": len(recs),
            "recommendations": [
                {
                    "type": r.type,
                    "priority": r.priority,
                    "confidence": r.confidence,
                    "title": r.title,
                    "description": r.description,
                    "action": r.action,
                    "entity_id": r.entity_id,
                    "entity_name": r.entity_name,
                    "impact": r.impact,
                    "metric_value": r.metric_value,
                    "source": r.source,
                }
                for r in recs
            ],
        }

    def get_performance_analytics(self) -> dict:
        logger.info("Running performance analytics")
        analyzer = PerformanceAnalyzer(self.db)
        result = analyzer.analyze()
        return {
            "team_avg_completion_days": result.team_avg_completion_days,
            "team_delay_pct": result.team_delay_pct,
            "team_avg_performance": result.team_avg_performance,
            "team_avg_reliability": result.team_avg_reliability,
            "users": [
                {
                    "user_id": u.user_id,
                    "name": u.name,
                    "email": u.email,
                    "role": u.role,
                    "performance_score": u.performance_score,
                    "reliability_score": u.reliability_score,
                    "speed_score": u.speed_score,
                    "avg_completion_days": u.avg_completion_days,
                    "delay_pct": u.delay_pct,
                    "total_completed": u.total_completed,
                    "total_delayed": u.total_delayed,
                    "approval_rate": u.approval_rate,
                    "avg_approval_hours": u.avg_approval_hours,
                    "total_comments": u.total_comments,
                    "monthly_trends": [
                        {"month": t.month, "completed": t.completed,
                         "avg_completion_days": t.avg_completion_days, "delay_pct": t.delay_pct}
                        for t in u.monthly_trends
                    ],
                    "suggestions": u.suggestions,
                }
                for u in result.users
            ],
            "top_performers": [
                {"user_id": u.user_id, "name": u.name, "score": u.performance_score}
                for u in result.top_performers
            ],
            "low_performers": [
                {"user_id": u.user_id, "name": u.name, "score": u.performance_score}
                for u in result.low_performers
            ],
        }

    def get_workload_analysis(self) -> dict:
        logger.info("Running workload analysis")
        engine = WorkloadAnalysisEngine(self.db, self.rules)
        result = engine.analyze()
        return {
            "team_balance": {
                "total_employees": result.team_balance.total_employees,
                "total_active_tasks": result.team_balance.total_active_tasks,
                "mean_workload": result.team_balance.mean_workload,
                "std_dev_workload": result.team_balance.std_dev_workload,
                "overloaded_count": result.team_balance.overloaded_count,
                "balanced_count": result.team_balance.balanced_count,
                "underutilized_count": result.team_balance.underutilized_count,
                "overloaded_pct": result.team_balance.overloaded_pct,
                "underutilized_pct": result.team_balance.underutilized_pct,
                "balanced_pct": result.team_balance.balanced_pct,
                "health_score": result.team_balance.health_score,
                "recommendations": result.team_balance.recommendations,
            },
            "distribution": result.distribution,
            "employees": [
                {
                    "user_id": e.user_id,
                    "name": e.name,
                    "email": e.email,
                    "role": e.role,
                    "active_tasks": e.active_tasks,
                    "pending_approvals": e.pending_approvals,
                    "overdue_tasks": e.overdue_tasks,
                    "completed_tasks": e.completed_tasks,
                    "total_assignments": e.total_assignments,
                    "workload_score": e.workload_score,
                    "efficiency_score": e.efficiency_score,
                    "status": e.status,
                    "active_task_details": e.active_task_details,
                }
                for e in result.employees
            ],
        }

    def recommend_assignment(self, priority: Optional[str] = None, exclude_user_id: Optional[int] = None) -> dict:
        logger.info("Recommending assignment (priority=%s)", priority or "any")
        recommender = AssignmentRecommender(self.db, self.rules)
        candidates = recommender.recommend(priority=priority, exclude_user_id=exclude_user_id)
        top = candidates[0] if candidates else None
        return {
            "recommended_user": {
                "id": top.user_id,
                "name": top.name,
                "email": top.email,
                "role": top.role,
            } if top else None,
            "score": top.total_score if top else 0,
            "reason": top.reason if top else "No suitable candidates found",
            "total_candidates": len(candidates),
            "candidates": [
                {
                    "user_id": c.user_id,
                    "name": c.name,
                    "email": c.email,
                    "role": c.role,
                    "score": c.total_score,
                    "factors": {k: {"score": v["score"], "confidence": v["confidence"]} for k, v in c.factors.items()},
                    "reason": c.reason,
                }
                for c in candidates[:10]
            ],
        }

    def get_delay_risks(self, current_user) -> list[dict]:
        logger.info("Running delay risk analysis for user_id=%d", current_user.id)
        analyzer = DelayRiskAnalyzer(self.db, self.rules)
        items = analyzer.analyze(_task_base_query(self.db, current_user))
        return [
            {
                "task_id": i.task_id,
                "title": i.title,
                "status": i.status,
                "priority": i.priority,
                "due_date": i.due_date,
                "days_remaining": i.days_remaining,
                "assignee_name": i.assignee_name,
                "assignee_email": i.assignee_email,
                "risk_score": i.risk_score,
                "risk_level": i.risk_level,
                "confidence_score": i.confidence_score,
                "predicted_delay_days": i.predicted_delay_days,
                "factors": i.factors,
                "warnings": i.warnings,
            }
            for i in items
        ]

    def get_high_priority_tasks(self, current_user) -> list[dict]:
        logger.info("Fetching high priority pending tasks for user_id=%d", current_user.id)
        now = datetime.utcnow()
        q = _task_base_query(self.db, current_user).filter(
            Task.priority == "high",
            Task.status != "done",
        )
        tasks = q.options(joinedload(Task.assignee)).order_by(Task.due_date.asc()).all()
        results = []
        for t in tasks:
            urgency = _calculate_urgency(t.due_date, now)
            results.append({
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "days_remaining": urgency["days_remaining"],
                "urgency_score": urgency["score"],
                "urgency_level": urgency["level"],
                "assignee": t.assignee.email if t.assignee else None,
                "assignee_name": t.assignee.name if t.assignee else None,
            })
        results.sort(key=lambda x: x["urgency_score"], reverse=True)
        logger.info("Found %d high priority pending tasks", len(results))
        return results

    def get_employee_productivity(self) -> dict:
        logger.info("Running employee productivity analysis")
        perf = PerformanceAnalyzer(self.db).analyze()
        workload = WorkloadAnalysisEngine(self.db, self.rules).analyze()

        perf_by_user = {u.user_id: u for u in perf.users}
        wl_by_user = {e.user_id: e for e in workload.employees}
        all_ids = sorted(set(perf_by_user.keys()) | set(wl_by_user.keys()))

        employees = []
        for uid in all_ids:
            p = perf_by_user.get(uid)
            w = wl_by_user.get(uid)
            if not p:
                continue

            insights = []
            tips = []

            if p.monthly_trends and len(p.monthly_trends) >= 2:
                recent = p.monthly_trends[-1]
                prev = p.monthly_trends[-2]
                if recent.delay_pct > prev.delay_pct + 10:
                    insights.append({"type": "warning", "severity": "high", "text": f"Delay rate increased {recent.delay_pct:.0f}% (was {prev.delay_pct:.0f}%) — review workload"})
                if recent.completed > prev.completed:
                    insights.append({"type": "positive", "severity": "low", "text": f"Completion count up from {prev.completed} to {recent.completed} tasks"})

            if p.performance_score >= 8:
                insights.append({"type": "positive", "severity": "low", "text": "Strong performer — maintaining high quality output"})
            elif p.performance_score < 5:
                insights.append({"type": "warning", "severity": "medium", "text": "Performance needs attention — review task load and skill fit"})

            if w:
                if w.workload_score > 7:
                    insights.append({"type": "warning", "severity": "high", "text": f"Workload critical ({w.workload_score:.1f}/10) — {w.active_tasks} active tasks, {w.overdue_tasks} overdue"})
                if w.efficiency_score > 8:
                    insights.append({"type": "positive", "severity": "low", "text": "Highly efficient — completing tasks well above average pace"})
            else:
                ws = max(0.0, min(10.0, p.total_completed / max(1, perf.team_avg_completion_days or 1) * 2))
                wl_by_user[uid] = type('obj', (object,), {'workload_score': ws, 'efficiency_score': 5.0, 'status': 'balanced', 'active_tasks': 0, 'overdue_tasks': 0})()

            if p.delay_pct > 40:
                tips.append("Focus on deadline adherence — consider breaking down large tasks")
            if p.avg_completion_days and p.avg_completion_days > (perf.team_avg_completion_days or 5) * 1.3:
                tips.append("Completion time is above team average — try time-boxing or pair programming")
            if p.approval_rate < 0.5 and p.total_completed > 0:
                tips.append("Approval rate is low — clarify requirements before starting work")
            if w and w.overdue_tasks >= 3:
                tips.append(f"{w.overdue_tasks} overdue tasks — prioritize clearing backlog")
            if not tips and p.performance_score >= 7:
                tips.append("Maintain current momentum — consider mentoring other team members")

            employees.append({
                "user_id": uid,
                "name": p.name,
                "email": p.email,
                "role": p.role,
                "completed_tasks": p.total_completed,
                "delayed_tasks": p.total_delayed,
                "delay_pct": p.delay_pct,
                "performance_score": round(p.performance_score, 2),
                "workload_score": round(w.workload_score, 2) if w else 0.0,
                "efficiency_score": round(w.efficiency_score, 2) if w else 0.0,
                "workload_status": w.status if w else "unknown",
                "avg_completion_days": round(p.avg_completion_days, 1) if p.avg_completion_days else None,
                "approval_rate": round(p.approval_rate, 2),
                "monthly_trends": [
                    {"month": t.month, "completed": t.completed,
                     "avg_completion_days": t.avg_completion_days, "delay_pct": t.delay_pct}
                    for t in p.monthly_trends
                ],
                "suggestions": p.suggestions[:3],
                "insights": insights,
                "improvement_tips": tips[:3],
            })

        team_avg_workload = round(
            sum(e["workload_score"] for e in employees) / len(employees), 2
        ) if employees else 0.0

        return {
            "total_employees": len(employees),
            "team_avg_performance": round(perf.team_avg_performance, 2),
            "team_avg_workload": team_avg_workload,
            "team_avg_completion_days": round(perf.team_avg_completion_days, 1) if perf.team_avg_completion_days else None,
            "team_delay_pct": round(perf.team_delay_pct, 1),
            "employees": employees,
        }

    def get_team_intelligence(self) -> dict:
        logger.info("Running team intelligence analysis")
        now = datetime.utcnow()

        workload = WorkloadAnalysisEngine(self.db, self.rules).analyze()
        perf = PerformanceAnalyzer(self.db).analyze()

        perf_by_user = {u.user_id: u for u in perf.users}
        wl_by_user = {e.user_id: e for e in workload.employees}
        all_ids = sorted(set(perf_by_user.keys()) | set(wl_by_user.keys()))

        team_workload = []
        productivity_rankings = []
        for uid in all_ids:
            p = perf_by_user.get(uid)
            w = wl_by_user.get(uid)
            name = p.name if p else (w.name if w else "Unknown")
            email = p.email if p else (w.email if w else "")
            role = p.role if p else (w.role if w else "")
            perf_score = p.performance_score if p else 0
            wl_score = w.workload_score if w else 0

            team_workload.append({
                "user_id": uid, "name": name, "email": email, "role": role,
                "workload_score": round(wl_score, 2),
                "active_tasks": w.active_tasks if w else 0,
                "overdue_tasks": w.overdue_tasks if w else 0,
                "efficiency_score": round(w.efficiency_score, 2) if w else 0,
                "status": w.status if w else "unknown",
            })
            perf_score_normalized = perf_score / 10.0 if perf_score > 10 else perf_score
            productivity_rankings.append({
                "user_id": uid, "name": name, "email": email, "role": role,
                "performance_score": round(perf_score, 2),
                "completed_tasks": p.total_completed if p else 0,
                "delayed_tasks": p.total_delayed if p else 0,
                "delay_pct": round(p.delay_pct, 1) if p else 0,
                "avg_completion_days": round(p.avg_completion_days, 1) if p and p.avg_completion_days else None,
                "speed_score": round(p.speed_score, 1) if p else 0,
                "reliability_score": round(p.reliability_score, 1) if p else 0,
            })

        team_workload.sort(key=lambda x: x["workload_score"], reverse=True)
        productivity_rankings.sort(key=lambda x: x["performance_score"], reverse=True)

        delayed_tasks_by_user = []
        for uid in all_ids:
            overdue = self.db.query(Task).filter(
                Task.assigned_to_id == uid,
                Task.due_date < now,
                Task.status != "done",
            ).all()
            completed_late = self.db.query(Task).filter(
                Task.assigned_to_id == uid,
                Task.status == "done",
                Task.due_date.isnot(None),
                Task.updated_at > Task.due_date,
            ).count()
            p = perf_by_user.get(uid)
            name = p.name if p else "Unknown"
            delayed_tasks_by_user.append({
                "user_id": uid, "name": name,
                "overdue_count": len(overdue),
                "completed_late_count": completed_late,
                "total_delayed": len(overdue) + completed_late,
                "overdue_tasks": [
                    {"id": t.id, "title": t.title, "due_date": t.due_date.isoformat() if t.due_date else None,
                     "days_late": (now - t.due_date).days if t.due_date else 0, "priority": t.priority}
                    for t in sorted(overdue, key=lambda x: x.due_date or now)[:5]
                ],
            })
        delayed_tasks_by_user.sort(key=lambda x: x["total_delayed"], reverse=True)

        approval_efficiency = []
        for uid in all_ids:
            p = perf_by_user.get(uid)
            name = p.name if p else "Unknown"
            total_reqs = self.db.query(Approval).filter(Approval.requested_by == uid).count()
            pending = self.db.query(Approval).filter(Approval.requested_by == uid, Approval.status == "pending").count()
            approved = self.db.query(Approval).filter(Approval.requested_by == uid, Approval.status == "approved").count()
            rejected = self.db.query(Approval).filter(Approval.requested_by == uid, Approval.status == "rejected").count()
            delayed_count = self.db.query(Approval).filter(
                Approval.requested_by == uid,
                Approval.status == "pending",
                Approval.created_at < now - timedelta(hours=self.rules.approval_delay_hours),
            ).count()
            approval_rate = round(approved / total_reqs * 100, 1) if total_reqs > 0 else 0
            avg_wait = self.db.query(
                func.avg((func.UNIX_TIMESTAMP(Approval.updated_at) - func.UNIX_TIMESTAMP(Approval.created_at)) / 3600)
            ).filter(
                Approval.requested_by == uid,
                Approval.status.in_(["approved", "rejected"]),
                Approval.updated_at.isnot(None),
            ).scalar()
            avg_wait_hours = round(float(avg_wait), 1) if avg_wait else None
            approval_efficiency.append({
                "user_id": uid, "name": name,
                "total_requests": total_reqs,
                "pending": pending,
                "approved": approved,
                "rejected": rejected,
                "delayed": delayed_count if total_reqs > 0 else 0,
                "approval_rate": approval_rate,
                "avg_wait_hours": avg_wait_hours,
            })
        approval_efficiency.sort(key=lambda x: x["approval_rate"])

        recommendations = RecommendationEngine(self.db, self.rules).generate()
        recs_data = [
            {"type": r.type, "priority": r.priority, "confidence": r.confidence,
             "title": r.title, "description": r.description, "action": r.action,
             "entity_id": r.entity_id, "entity_name": r.entity_name, "impact": r.impact,
             "metric_value": r.metric_value, "source": r.source}
            for r in recommendations
        ]

        team_avg_wl = round(
            sum(e["workload_score"] for e in team_workload) / len(team_workload), 2
        ) if team_workload else 0.0

        delayed_total = sum(d["total_delayed"] for d in delayed_tasks_by_user)
        all_overdue_tasks = sum(d["overdue_count"] for d in delayed_tasks_by_user)

        return {
            "team_workload": {
                "total_employees": len(team_workload),
                "avg_workload": team_avg_wl,
                "avg_efficiency": round(
                    sum(e["efficiency_score"] for e in team_workload) / len(team_workload), 2
                ) if team_workload else 0,
                "employees": team_workload,
            },
            "productivity_rankings": {
                "total_employees": len(productivity_rankings),
                "avg_performance": round(
                    sum(r["performance_score"] for r in productivity_rankings) / len(productivity_rankings), 2
                ) if productivity_rankings else 0,
                "rankings": productivity_rankings,
            },
            "delayed_task_analysis": {
                "total_delayed": delayed_total,
                "overdue_active": all_overdue_tasks,
                "completed_late": delayed_total - all_overdue_tasks,
                "by_user": delayed_tasks_by_user,
            },
            "approval_efficiency": {
                "total_pending": sum(a["pending"] for a in approval_efficiency),
                "avg_approval_rate": round(
                    sum(a["approval_rate"] for a in approval_efficiency) / len(approval_efficiency), 1
                ) if approval_efficiency else 0,
                "delayed_approvals": sum(a["delayed"] for a in approval_efficiency),
                "by_user": approval_efficiency,
            },
            "recommendations": recs_data[:12],
        }

    def get_history(self, current_user, skip: int = 0, limit: int = 50):
        return (
            self.db.query(AIAnalysis)
            .filter(AIAnalysis.user_id == current_user.id)
            .order_by(AIAnalysis.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )


def get_ai_service(db: Session) -> AIService:
    return AIService(db)
