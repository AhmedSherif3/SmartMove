from rest_framework import serializers
from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'priority', 'icon', 'title', 'message',
            'link', 'actions', 'is_read', 'source_app', 'created_at',
        ]
        read_only_fields = fields


class AdminBroadcastSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    priority = serializers.ChoiceField(
        choices=Notification.Priority.choices,
        default='info',
    )
    link = serializers.CharField(max_length=512, required=False, default='')
    target_role = serializers.ChoiceField(
        choices=[('', 'All'), ('USER', 'User'), ('DATA_ANALYST', 'Data Analyst'), ('ADMIN', 'Admin')],
        required=False,
        default='',
        allow_blank=True,
    )
    target_region = serializers.ChoiceField(
        choices=[('', 'All'), ('egypt', 'Egypt'), ('dubai', 'Dubai'), ('england', 'England')],
        required=False,
        default='',
        allow_blank=True,
    )
