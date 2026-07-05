import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from apps.notifications.services import (
    mark_as_read, mark_all_as_read, get_unread_count
)
from apps.notifications.models import Notification


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Per-user WebSocket for real-time notification delivery.
    URL: ws://host/ws/notifications/
    """

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return

        self.group_name = f'user_notifications_{user.id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        # Send initial unread count on connect
        count = await sync_to_async(get_unread_count)(user)
        await self.send(text_data=json.dumps({
            'type': 'unread_count_update',
            'unread_count': count,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        action = data.get('action')

        if action == 'mark_read':
            notif_id = data.get('id')
            if notif_id:
                await sync_to_async(mark_as_read)(notif_id, user)

        elif action == 'mark_all_read':
            await sync_to_async(mark_all_as_read)(user)

        elif action == 'delete':
            notif_id = data.get('id')
            if notif_id:
                deleted, _ = await sync_to_async(
                    Notification.objects.filter(id=notif_id, user=user).delete
                )()
                if deleted:
                    count = await sync_to_async(get_unread_count)(user)
                    await self.send(text_data=json.dumps({
                        'type': 'unread_count_update',
                        'unread_count': count,
                    }))

    # ── Group message handlers (called by channel_layer.group_send) ──

    async def new_notification(self, event):
        """Forward new notification to the WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'new_notification',
            'notification': event['notification'],
        }))

    async def unread_count_update(self, event):
        """Forward updated count to the WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'unread_count_update',
            'unread_count': event['unread_count'],
        }))
