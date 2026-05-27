"""
Reusable SLA monitoring service for automatic breach detection.

Designed to be called from:
- Enterprise scheduler (periodic background task)
- API endpoint (on-demand)
- CLI command
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.models.sla_tracking import SLATracking
from app.models.sla_rule import SLARule
from app.models.task import Task
from app.models.approval import Approval
from app.models.approval_escalation import ApprovalEscalation
from app.models.user import User
from app.models.notification import NotificationType, NotificationCategory, NotificationPriority
from app.services.notification_service import create_notification
from app.services.enterprise_audit_service import log_sla_breach
from app.core.log import get_logger

logger = get_logger("sla_monitor_service")

VALID_BREACH_REASON = "Auto-detected: SLA due time exceeded"


class SlaMonitorService:

    @staticmethod
    def check_and_process_overdue(db: Session) -> dict:
        """
        Find all active/overdue SLA tracking records and process each one.

        For each overdue record:
          1. Mark the SLATracking row as breached
          2. Update the related Task or Approval SLA fields
          3. Trigger an approval escalation if the SLA rule has escalation enabled
          4. Send breach notifications to relevant users
          5. Create an audit-log entry

        Returns a summary dict.
        """
        now = datetime.utcnow()
        overdue = db.scalars(
            select(SLATracking)
            .where(
                SLATracking.status == "active",
                SLATracking.due_time < now,
            )
            .order_by(SLATracking.due_time.asc())
        ).all()

        stats: dict[str, int] = {
            "checked": len(overdue),
            "breached": 0,
            "tasks_updated": 0,
            "approvals_updated": 0,
            "escalations_triggered": 0,
            "notifications_sent": 0,
        }

        if not overdue:
            logger.info("SLA monitor: no overdue records found")
            return stats

        logger.info("SLA monitor: found %d overdue records", len(overdue))

        for tracking in overdue:
            try:
                SlaMonitorService._mark_breached(tracking)
                stats["breached"] += 1

                if tracking.module_name == "task":
                    SlaMonitorService._update_task(tracking, db)
                    stats["tasks_updated"] += 1
                elif tracking.module_name == "approval":
                    SlaMonitorService._update_approval(tracking, db)
                    stats["approvals_updated"] += 1

                if tracking.sla_rule and tracking.sla_rule.escalation_enabled:
                    SlaMonitorService._trigger_escalation(tracking, db)
                    stats["escalations_triggered"] += 1

                SlaMonitorService._send_notifications(tracking, db)
                stats["notifications_sent"] += 1

                log_sla_breach(
                    db, tracking.id, tracking.module_name,
                    tracking.record_id, VALID_BREACH_REASON,
                )

            except Exception as exc:
                logger.error(
                    "SLA monitor: error processing tracking id=%d: %s",
                    tracking.id, exc,
                )

        db.commit()
        logger.info("SLA monitor complete: %s", stats)
        return stats

    # ── private helpers ─────────────────────────────────────────────

    @staticmethod
    def _mark_breached(tracking: SLATracking) -> None:
        tracking.status = "breached"
        tracking.breach_reason = VALID_BREACH_REASON
        logger.info(
            "SLA breach: tracking id=%d module=%s record_id=%d",
            tracking.id, tracking.module_name, tracking.record_id,
        )

    @staticmethod
    def _update_task(tracking: SLATracking, db: Session) -> None:
        task = db.scalar(select(Task).where(Task.id == tracking.record_id))
        if not task:
            logger.warning("SLA monitor: task id=%d not found", tracking.record_id)
            return
        task.sla_status = "breached"
        task.is_sla_breached = True
        logger.info("SLA monitor: task id=%d sla_status→breached", task.id)

    @staticmethod
    def _update_approval(tracking: SLATracking, db: Session) -> None:
        approval = db.scalar(select(Approval).where(Approval.id == tracking.record_id))
        if not approval:
            logger.warning("SLA monitor: approval id=%d not found", tracking.record_id)
            return
        approval.sla_status = "breached"
        logger.info("SLA monitor: approval id=%d sla_status→breached", approval.id)

    @staticmethod
    def _trigger_escalation(tracking: SLATracking, db: Session) -> None:
        """Create an escalation record for the breached approval."""
        if tracking.module_name != "approval":
            return

        sla_rule = tracking.sla_rule
        if not sla_rule or not sla_rule.escalation_enabled:
            return

        approval = db.scalar(select(Approval).where(Approval.id == tracking.record_id))
        if not approval:
            return

        target_user_id = SlaMonitorService._find_escalation_target(tracking, approval, db)
        if not target_user_id:
            logger.warning(
                "SLA monitor: no escalation target for approval id=%d", approval.id,
            )
            return

        if SlaMonitorService._has_active_escalation(approval.id, db):
            logger.info(
                "SLA monitor: active escalation exists for approval id=%d, skipping",
                approval.id,
            )
            return

        source_user_id = sla_rule.created_by

        escalation = ApprovalEscalation(
            approval_id=approval.id,
            escalated_from=source_user_id,
            escalated_to=target_user_id,
            reason=(
                f"Automatic escalation due to SLA breach "
                f"(tracking id={tracking.id})"
            ),
            escalation_level=sla_rule.escalation_level if hasattr(sla_rule, 'escalation_level') and sla_rule.escalation_level else "manager",
            status="active",
        )
        db.add(escalation)
        db.flush()

        approval.is_escalated = True
        approval.current_escalation_to = target_user_id

        logger.info(
            "SLA monitor: escalation id=%d created approval id=%d → user id=%d",
            escalation.id, approval.id, target_user_id,
        )

    @staticmethod
    def _find_escalation_target(
        tracking: SLATracking, approval: Approval, db: Session,
    ) -> Optional[int]:
        """Determine the user to escalate to."""
        if approval.current_escalation_to:
            user = db.scalar(
                select(User).where(
                    User.id == approval.current_escalation_to,
                    User.is_active.is_(True),
                )
            )
            if user:
                return user.id

        sla_rule = tracking.sla_rule
        if sla_rule:
            user = db.scalar(
                select(User).where(
                    User.id == sla_rule.created_by,
                    User.is_active.is_(True),
                )
            )
            if user:
                return user.id

        user = db.scalar(
            select(User)
            .where(User.is_active.is_(True), User.role.in_(["admin", "manager"]))
            .order_by(User.id)
            .limit(1)
        )
        if user:
            return user.id

        return None

    @staticmethod
    def _has_active_escalation(approval_id: int, db: Session) -> bool:
        existing = db.scalar(
            select(ApprovalEscalation).where(
                and_(
                    ApprovalEscalation.approval_id == approval_id,
                    ApprovalEscalation.status == "active",
                )
            )
        )
        return existing is not None

    @staticmethod
    def _send_notifications(tracking: SLATracking, db: Session) -> None:
        """Notify relevant users of the SLA breach."""
        recipients: set[int] = set()

        if tracking.module_name == "task":
            task = db.scalar(select(Task).where(Task.id == tracking.record_id))
            if task:
                if task.assigned_to_id:
                    recipients.add(task.assigned_to_id)
                if task.created_by_id:
                    recipients.add(task.created_by_id)
        elif tracking.module_name == "approval":
            approval = db.scalar(select(Approval).where(Approval.id == tracking.record_id))
            if approval:
                recipients.add(approval.requested_by)
                if approval.current_escalation_to:
                    recipients.add(approval.current_escalation_to)

        message = (
            f"SLA Breach: {tracking.module_name} #{tracking.record_id} "
            f"exceeded its SLA due time and has been marked as breached."
        )

        for user_id in recipients:
            try:
                create_notification(
                    db, user_id, message,
                    type=NotificationType.sla_breach,
                    notification_type=NotificationCategory.sla,
                    priority=NotificationPriority.high,
                )
            except Exception as exc:
                logger.error(
                    "SLA monitor: failed to notify user id=%d: %s",
                    user_id, exc,
                )
