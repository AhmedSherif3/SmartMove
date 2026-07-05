from rest_framework import serializers
from .models import UserIntegration


class UserIntegrationSerializer(serializers.ModelSerializer):
    """Exposes the provider name and connection timestamp for the frontend."""

    class Meta:
        model = UserIntegration
        fields = ['id', 'provider', 'created_at']
        read_only_fields = ['id', 'provider', 'created_at']
