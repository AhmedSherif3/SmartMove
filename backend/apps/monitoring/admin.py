from django.contrib import admin

from .models import SelfHealingLog


@admin.register(SelfHealingLog)
class SelfHealingLogAdmin(admin.ModelAdmin):
    """Admin view for SOC self-healing audit logs."""

    list_display = (
        'triggered_at',
        'alert_name',
        'severity',
        'runbook_name',
        'status',
        'service',
        'completed_at',
    )
    list_filter = ('severity', 'status', 'service')
    search_fields = ('alert_name', 'runbook_name', 'result_message')
    readonly_fields = (
        'alert_name',
        'severity',
        'runbook_name',
        'status',
        'result_message',
        'alert_payload',
        'service',
        'triggered_at',
        'completed_at',
    )
    ordering = ('-triggered_at',)
    date_hierarchy = 'triggered_at'

    def has_add_permission(self, request):
        """Logs are created by the webhook receiver, not manually."""
        return False

    def has_change_permission(self, request, obj=None):
        """Logs are immutable audit records."""
        return False
