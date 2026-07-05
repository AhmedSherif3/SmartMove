"""
SmartMove Reports — Django Admin Configuration
"""

from django.contrib import admin

from .models import Report, ReportActivityLog


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    """Admin interface for the Report model."""

    list_display = (
        'title',
        'region',
        'report_month',
        'report_year',
        'is_published',
        'file_size_bytes',
        'generated_at',
    )
    list_filter = ('region', 'is_published', 'report_year')
    search_fields = ('title',)
    list_editable = ('is_published',)
    ordering = ('-report_year', '-report_month')
    readonly_fields = ('generated_at', 'azure_blob_url', 'file_size_bytes')

@admin.register(ReportActivityLog)
class ReportActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'report', 'action', 'timestamp', 'ip_address')
    list_filter = ('action', 'timestamp')
    search_fields = ('user__email', 'report__title')
    readonly_fields = ('user', 'report', 'action', 'ip_address', 'timestamp')
