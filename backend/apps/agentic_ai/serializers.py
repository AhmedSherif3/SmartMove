# DRF Serializers (Input/Output JSON contract validation)
from rest_framework import serializers
from .models import AgentSession
from django.utils import timezone
import datetime

class AgentSessionHistorySerializer(serializers.ModelSerializer):
    expires_in_days = serializers.SerializerMethodField()

    class Meta:
        model = AgentSession
        fields = ['id', 'title', 'created_at', 'expires_in_days']

    def get_expires_in_days(self, obj):
        expiration_date = obj.created_at + datetime.timedelta(days=7)
        time_left = expiration_date - timezone.now()
        return max(0, time_left.days)

class InitializeSessionSerializer(serializers.Serializer):
    """
    Validates the incoming payload from Next.js when starting a new AI swarm session.
    """
    workspace_id = serializers.UUIDField(
        required=False, 
        allow_null=True, 
        help_text="Optional: The UUID of the MinIO workspace the AI should analyze."
    )
    
    # You can easily add more configuration flags here in the future
    # e.g., force_region = serializers.CharField(required=False)