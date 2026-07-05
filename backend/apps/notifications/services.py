import logging
from apps.notifications.models import Notification, BroadcastLog, NotificationPreference
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)
User = get_user_model()


def create_notification(
    user,
    title: str,
    message: str,
    notification_type: str = 'system',
    priority: str = 'info',
    link: str = '',
    icon: str = '',
    # pyrefly: ignore [bad-function-definition]
    actions: list = None,
    source_app: str = '',
    expires_at=None,
) -> Notification:
    """
    Central entry point. Creates a DB record and pushes a real-time
    WebSocket event to the user's personal notification channel.
    """
    # Check preferences before sending
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    pref_map = {
        'ai': prefs.ai_notifications,
        'report': prefs.report_notifications,
        'security': prefs.security_notifications,
        'admin': prefs.admin_broadcasts,
        'cloud': prefs.cloud_notifications,
        'subscription': prefs.subscription_notifications,
    }
    if notification_type in pref_map and not pref_map[notification_type]:
        # pyrefly: ignore [bad-return]
        return None  # User disabled this category

    notif = Notification.objects.create(
        user=user,
        type=notification_type,
        priority=priority,
        title=title,
        message=message,
        link=link,
        icon=icon,
        actions=actions or [],
        source_app=source_app,
        expires_at=expires_at,
    )

    # Push real-time event via Django Channels
    _push_ws_event(user.id, {
        'type': 'new_notification',
        'notification': _serialize(notif),
    })

    return notif


def broadcast_to_users(
    sender,
    title: str,
    message: str,
    priority: str = 'info',
    link: str = '',
    target_role: str | None = None,
    target_region: str | None = None,
):
    """
    Admin broadcast — creates one Notification per matching user.
    Includes rate limiting and audit logging.
    """
    # Rate Limiting: max 10 broadcasts per hour per admin
    recent_broadcasts = BroadcastLog.objects.filter(
        sender=sender,
        created_at__gte=timezone.now() - timedelta(hours=1)
    ).count()
    
    if recent_broadcasts >= 10:
        raise ValueError("Broadcast rate limit exceeded. Max 10 per hour.")

    qs = User.objects.filter(is_active=True)
    if target_role:
        qs = qs.filter(role=target_role)
    if target_region:
        qs = qs.filter(region=target_region)

    count = 0
    for u in qs.iterator():
        notif = create_notification(
            user=u,
            title=title,
            message=message,
            notification_type='admin',
            priority=priority,
            link=link,
            icon='broadcast',  # Give it a default broadcast icon
            source_app='admin_broadcast',
        )
        if notif:
            count += 1

    # Audit log
    BroadcastLog.objects.create(
        sender=sender,
        title=title,
        message=message,
        target_role=target_role or 'All',
        target_region=target_region or 'All',
        recipient_count=count,
    )
    return count


def mark_as_read(notification_id, user):
    """Mark a single notification as read. Returns True if updated."""
    updated = Notification.objects.filter(
        id=notification_id, user=user
    ).update(is_read=True)
    if updated:
        _push_unread_count(user)
    return updated > 0


def mark_all_as_read(user):
    """Mark ALL of a user's unread notifications as read."""
    count = Notification.objects.filter(
        user=user, is_read=False
    ).update(is_read=True)
    if count > 0:
        _push_unread_count(user)
    return count


def get_unread_count(user) -> int:
    return Notification.objects.filter(user=user, is_read=False).count()


def _push_ws_event(user_id, event: dict):
    """Send an event to the user's personal notification channel group."""
    from apps.chatbot.services.pusher_service import get_pusher_client
    pusher = get_pusher_client()
    if pusher is None:
        return
    try:
        pusher.trigger(
            f'private-notifications-{user_id}',
            'notification-event',
            event,
        )
    except Exception as e:
        logger.warning("Failed to push Pusher notification: %s", e)


def _push_unread_count(user):
    """Push updated unread count after read/delete operations."""
    count = get_unread_count(user)
    _push_ws_event(user.id, {
        'type': 'unread_count_update',
        'unread_count': count,
    })


def _serialize(notif: Notification) -> dict:
    """Lightweight dict for WebSocket payloads."""
    return {
        'id': str(notif.id),
        'type': notif.type,
        'priority': notif.priority,
        'icon': notif.icon,
        'title': notif.title,
        'message': notif.message,
        'link': notif.link,
        'actions': notif.actions,
        'is_read': notif.is_read,
        'source_app': notif.source_app,
        'created_at': notif.created_at.isoformat(),
    }
