import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.notifications.services import create_notification

logger = logging.getLogger(__name__)


# ── SmartMove Cloud: File Uploaded ───────────────────────────────────────
@receiver(post_save, sender='smartmove_cloud.UserFile')
def notify_file_uploaded(sender, instance, created, **kwargs):
    if not created:
        return
    create_notification(
        user=instance.user,
        title='File Uploaded Successfully',
        message=f'"{instance.filename}" has been added to your Cloud workspace.',
        notification_type='cloud',
        priority='info',
        icon='upload',
        link='/cloud',
        source_app='smartmove_cloud',
    )


# ── Reports: New Monthly Report Published ────────────────────────────────
@receiver(post_save, sender='reports.Report')
def notify_new_report(sender, instance, created, **kwargs):
    if not created:
        return
    from django.contrib.auth import get_user_model
    User = get_user_model()
    # Notify all users in the report's region
    users = User.objects.filter(region=instance.region, is_active=True)
    for user in users.iterator():
        create_notification(
            user=user,
            title=f'New {instance.get_region_display()} Report',
            message=f'The {instance.title} report is now available for viewing.',
            notification_type='report',
            priority='info',
            icon='report',
            link='/reports',
            source_app='reports',
            actions=[{'label': 'View Report', 'url': '/reports'}]
        )


# ── Subscriptions: Plan Changed ──────────────────────────────────────────
@receiver(post_save, sender='subscriptions.Subscription')
def notify_subscription_change(sender, instance, created, **kwargs):
    if created:
        msg = f'Your "{instance.get_plan_type_display()}" subscription is now active.'
        priority = 'success'
    else:
        msg = f'Your "{instance.get_plan_type_display()}" subscription status changed to: {instance.status}.'
        priority = 'info'
    create_notification(
        user=instance.user,
        title='Subscription Updated',
        message=msg,
        notification_type='subscription',
        priority=priority,
        icon='subscription',
        link='/settings',
        source_app='subscriptions',
    )


# ── Security: Audit Log Events ──────────────────────────────────────────
@receiver(post_save, sender='users.AuditLog')
def notify_security_event(sender, instance, created, **kwargs):
    if not created or not instance.user:
        return
    action_lower = instance.action.lower()
    if 'login' in action_lower and 'new ip' in action_lower:
        create_notification(
            user=instance.user,
            title='New Login Detected',
            message=f'A login from IP {instance.ip_address or "unknown"} was detected on your account.',
            notification_type='security',
            priority='warning',
            icon='security',
            link='/settings',
            source_app='security',
        )
    elif 'locked' in action_lower:
        create_notification(
            user=instance.user,
            title='Account Locked',
            message='Your account has been locked due to multiple failed login attempts.',
            notification_type='security',
            priority='error',
            icon='security',
            source_app='security',
        )
