"""
Chatbot Domain Models
=====================
UserQuota          — Enforces per-day query limits by role.
ConversationAuditLog — Immutable audit trail for every LLM interaction (Grafana-ready).
"""
from __future__ import annotations

from django.conf import settings
from django.db import models
from django.db.models import Manager
from django.utils import timezone


class UserQuota(models.Model):
    """
    Tracks daily query consumption per user.

    Business Rules:
        • USER  role  → 5 queries / day
        • DATA_ANALYST → 50 queries / day
        • ADMIN        → unlimited (enforced in consumer, not here)

    The quota resets automatically at midnight UTC; the consumer checks
    `last_reset` and zeroes the counter when a new calendar day starts.
    """

    # Explicit Type Annotations for Static Type Checkers
    objects: Manager[UserQuota] = Manager()

    class RoleLimit(models.IntegerChoices):
        USER = 5, '5 queries/day'
        DATA_ANALYST = 50, '50 queries/day'
        ADMIN = 999_999, 'Unlimited'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chatbot_quota',
        primary_key=True,
    )
    queries_used_today = models.PositiveIntegerField(default=0)
    max_queries_per_day = models.PositiveIntegerField(
        default=RoleLimit.USER,
        help_text='Maximum allowed queries per calendar day.',
    )
    last_reset = models.DateField(
        default=timezone.now,
        help_text='Date when the counter was last zeroed.',
    )

    class Meta:
        verbose_name = 'User Quota'
        verbose_name_plural = 'User Quotas'

    def __str__(self) -> str:
        user_email: str = str(getattr(self.user, 'email', 'unknown'))
        return (
            f"{user_email}: "
            f"{self.queries_used_today}/{self.max_queries_per_day} "
            f"(reset {self.last_reset})"
        )

    # ── Helper Methods ────────────────────────────────────────────────────

    def reset_if_new_day(self) -> None:
        """Zero the counter when the calendar day rolls over."""
        today = timezone.now().date()
        if self.last_reset < today:
            self.queries_used_today = 0  # type: ignore[assignment]
            self.last_reset = today  # type: ignore[assignment]
            self.save(update_fields=['queries_used_today', 'last_reset'])

    def has_remaining(self) -> bool:
        """Return True if the user has not exhausted their daily quota."""
        self.reset_if_new_day()
        return int(self.queries_used_today) < int(self.max_queries_per_day)

    def increment(self) -> None:
        """Atomically bump the counter by one."""
        self.reset_if_new_day()
        self.queries_used_today = models.F('queries_used_today') + 1  # type: ignore[assignment]
        self.save(update_fields=['queries_used_today'])
        self.refresh_from_db()

    @classmethod
    def get_or_create_for_user(cls, user: object) -> UserQuota:
        """
        Return (or create) the quota row, auto-setting the limit from role.
        """
        role_map: dict[str, int] = {
            'USER': cls.RoleLimit.USER,
            'DATA_ANALYST': cls.RoleLimit.DATA_ANALYST,
            'ADMIN': cls.RoleLimit.ADMIN,
        }
        user_role: str = str(getattr(user, 'role', 'USER'))
        max_q: int = role_map.get(user_role, cls.RoleLimit.USER)
        quota, _ = cls.objects.get_or_create(
            user=user,
            defaults={'max_queries_per_day': max_q},
        )
        return quota


class ConversationAuditLog(models.Model):
    """
    Immutable audit record for every chatbot interaction.

    Designed for ingestion by Grafana Loki / Prometheus:
        • token_usage fields enable cost dashboards.
        • model_used enables per-model latency tracking.
        • response_time_ms enables P95/P99 SLO alerting.
    """

    # Explicit Type Annotations for Static Type Checkers
    objects: Manager[ConversationAuditLog] = Manager()

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chatbot_audit_logs',
    )
    session_id = models.CharField(
        max_length=64,
        db_index=True,
        help_text='WebSocket channel name or session UUID.',
    )
    prompt = models.TextField(help_text="User's raw input text.")
    response = models.TextField(help_text="Agent's final response text.")
    model_used = models.CharField(
        max_length=64,
        blank=True,
        default='',
        help_text='e.g. gemini-2.0-flash, gpt-4o',
    )
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    response_time_ms = models.PositiveIntegerField(
        default=0,
        help_text='End-to-end latency in milliseconds.',
    )
    tools_invoked = models.JSONField(
        default=list,
        blank=True,
        help_text='List of tool names that were called during the turn.',
    )
    cache_hit = models.BooleanField(
        default=False,
        help_text='True if the response was served from semantic cache.',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Conversation Audit Log'
        verbose_name_plural = 'Conversation Audit Logs'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['session_id', '-created_at']),
        ]

    def __str__(self) -> str:
        user_label: str = str(getattr(self.user, 'email', 'anonymous')) if self.user else 'anonymous'
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {user_label} → {self.model_used}"
