from django.contrib import admin
from .models import Notification, BroadcastLog, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'type', 'priority', 'is_read', 'source_app', 'created_at', 'expires_at')
    list_filter = ('type', 'priority', 'is_read', 'source_app')
    search_fields = ('title', 'message', 'user__email')
    readonly_fields = ('id', 'created_at')
    ordering = ('-created_at',)


@admin.register(BroadcastLog)
class BroadcastLogAdmin(admin.ModelAdmin):
    list_display = ('title', 'sender', 'target_role', 'target_region', 'recipient_count', 'created_at')
    list_filter = ('target_role', 'target_region')
    search_fields = ('title', 'message', 'sender__email')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'ai_notifications', 'report_notifications', 'security_notifications', 'admin_broadcasts', 'cloud_notifications', 'subscription_notifications')
    search_fields = ('user__email',)
