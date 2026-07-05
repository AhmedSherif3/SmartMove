"""
SmartMove SOC — Self-Healing Log Model

Tracks every automated runbook execution triggered by Alertmanager webhooks.
Provides a complete forensic audit trail for incident response.
"""

from django.db import models


class SelfHealingLog(models.Model):
    """
    Immutable audit record of a self-healing action executed by the SOC.

    Each row represents a single runbook invocation — whether it succeeded,
    what alert triggered it, and the full context from Alertmanager.
    """

    objects = models.Manager()  # type: ignore[assignment]  # Explicit default manager for Pyright

    class Severity(models.TextChoices):
        INFO     = 'info',     'Info'
        WARNING  = 'warning',  'Warning'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        TRIGGERED = 'triggered', 'Triggered'
        SUCCESS   = 'success',   'Success'
        FAILED    = 'failed',    'Failed'
        SKIPPED   = 'skipped',   'Skipped'

    # ── Alert Identity ────────────────────────────────────────
    alert_name = models.CharField(
        max_length=255,
        db_index=True,
        help_text="The alertname label from the Alertmanager payload.",
    )
    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.WARNING,
        db_index=True,
    )

    # ── Runbook Execution ─────────────────────────────────────
    runbook_name = models.CharField(
        max_length=255,
        help_text="Python function name from runbooks.py that was invoked.",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TRIGGERED,
    )
    result_message = models.TextField(
        blank=True,
        default='',
        help_text="Stdout/stderr or summary returned by the runbook.",
    )

    # ── Context ───────────────────────────────────────────────
    alert_payload = models.JSONField(
        default=dict,
        blank=True,
        help_text="Full JSON payload received from Alertmanager.",
    )
    service = models.CharField(
        max_length=100,
        blank=True,
        default='',
        db_index=True,
        help_text="The service label from the alert (e.g. backend, celery, redis).",
    )

    # ── Timestamps ────────────────────────────────────────────
    triggered_at = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-triggered_at']
        verbose_name = 'Self-Healing Log'
        verbose_name_plural = 'Self-Healing Logs'
        indexes = [
            models.Index(
                fields=['alert_name', 'severity', '-triggered_at'],
                name='idx_alert_severity_time',
            ),
        ]

    def __str__(self):
        return (
            f"[{str(self.severity).upper()}] {self.alert_name} → "
            f"{self.runbook_name} ({self.status})"
        )
