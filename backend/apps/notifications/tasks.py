import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings
from apps.notifications.models import Notification
from apps.notifications.services import create_notification

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def check_storage_quota_warnings():
    """
    Hourly check. Warns users whose Cloud storage is >= 85%.
    Skips if a similar warning was already sent in the last 24 hours.
    """
    from apps.smartmove_cloud.models import get_storage_quota, get_used_storage

    for user in User.objects.filter(is_active=True).iterator():
        quota = get_storage_quota(user)
        used = get_used_storage(user)
        if quota == 0:
            continue
        pct = (used / quota) * 100
        if pct < 85:
            continue

        # Don't spam — check if we already warned in last 24h
        recent = Notification.objects.filter(
            user=user,
            source_app='storage_quota',
            created_at__gte=timezone.now() - timedelta(hours=24),
        ).exists()
        if recent:
            continue

        create_notification(
            user=user,
            title='Storage Quota Alert',
            message=f'You have used {pct:.0f}% of your allocated storage. Consider deleting unused files or upgrading your plan.',
            notification_type='cloud',
            priority='warning',
            icon='warning',
            link='/cloud',
            source_app='storage_quota',
        )


@shared_task
def check_subscription_expiry():
    """
    Daily check. Warns users whose subscription expires within 7 days.
    """
    from apps.subscriptions.models import Subscription

    threshold = timezone.now() + timedelta(days=7)
    expiring = Subscription.objects.filter(
        status__in=['active', 'trialing'],
        current_period_end__lte=threshold,
        cancel_at_period_end=False,
    ).select_related('user')

    for sub in expiring.iterator():
        recent = Notification.objects.filter(
            user=sub.user,
            source_app='subscription_expiry',
            created_at__gte=timezone.now() - timedelta(days=3),
        ).exists()
        if recent:
            continue

        days_left = (sub.current_period_end - timezone.now()).days
        create_notification(
            user=sub.user,
            title='Subscription Expiring Soon',
            message=f'Your "{sub.get_plan_type_display()}" subscription expires in {days_left} days. Renew to avoid service interruption.',
            notification_type='subscription',
            priority='warning',
            icon='subscription',
            link='/settings',
            source_app='subscription_expiry',
        )


@shared_task
def prune_old_notifications():
    """
    Daily cleanup. Deletes expired notifications AND those older than RETENTION_DAYS.
    """
    now = timezone.now()
    
    # 1. Delete explicitly expired notifications
    expired_count, _ = Notification.objects.filter(expires_at__lt=now).delete()
    
    # 2. Delete aged notifications
    retention_days = getattr(settings, 'NOTIFICATION_RETENTION_DAYS', 90)
    cutoff = now - timedelta(days=retention_days)
    aged_count, _ = Notification.objects.filter(created_at__lt=cutoff).delete()
    
    logger.info(f"Pruned {expired_count} expired, {aged_count} aged notifications")
