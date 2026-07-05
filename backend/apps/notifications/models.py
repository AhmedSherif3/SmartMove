import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    Persistent notification record linked to a single user.
    """

    class Type(models.TextChoices):
        SYSTEM       = 'system',       'System'
        DATA         = 'data',         'Data'
        AI           = 'ai',           'AI'
        SECURITY     = 'security',     'Security'
        ADMIN        = 'admin',        'Admin Broadcast'
        SUBSCRIPTION = 'subscription', 'Subscription'
        REPORT       = 'report',       'Report'
        CLOUD        = 'cloud',        'Cloud'

    class Priority(models.TextChoices):
        INFO    = 'info',    'Info'
        SUCCESS = 'success', 'Success'
        WARNING = 'warning', 'Warning'
        ERROR   = 'error',   'Error'

    objects = models.Manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="The recipient of this notification."
    )
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.SYSTEM)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.INFO)
    icon = models.CharField(
        max_length=50, blank=True, default='',
        help_text="e.g. 'upload', 'report', 'security', 'warning'"
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(
        max_length=512, blank=True, default='',
        help_text="Optional deep-link path, e.g. '/cloud'"
    )
    actions = models.JSONField(
        default=list, blank=True,
        help_text="List of action buttons, e.g. [{'label': 'View Report', 'url': '...'}]"
    )
    is_read = models.BooleanField(default=False, db_index=True)
    source_app = models.CharField(
        max_length=50, blank=True, default='',
        help_text="e.g. 'agentic_ai', 'smartmove_cloud', 'admin_broadcast'"
    )
    expires_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Time after which notification automatically disappears"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'created_at']),
        ]
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'

    def __str__(self):
        return f"[{self.priority}] {self.title} → {self.user.email}"


class BroadcastLog(models.Model):
    """Audit log for admin broadcasts."""
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='broadcasts_sent'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    target_role = models.CharField(max_length=50, blank=True)
    target_region = models.CharField(max_length=50, blank=True)
    recipient_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Broadcast Log'
        verbose_name_plural = 'Broadcast Logs'

    def __str__(self):
        return f"Broadcast: {self.title} by {self.sender} ({self.recipient_count} users)"


class NotificationPreference(models.Model):
    """User preferences to toggle notification categories."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notification_prefs'
    )
    ai_notifications = models.BooleanField(default=True)
    report_notifications = models.BooleanField(default=True)
    security_notifications = models.BooleanField(default=True)
    admin_broadcasts = models.BooleanField(default=True)
    cloud_notifications = models.BooleanField(default=True)
    subscription_notifications = models.BooleanField(default=True)

    def __str__(self):
        return f"Prefs for {self.user.email}"
