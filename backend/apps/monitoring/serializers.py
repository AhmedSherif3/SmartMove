from rest_framework import serializers
from .models import SelfHealingLog

class SelfHealingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SelfHealingLog
        fields = [
            'id',
            'alert_name',
            'severity',
            'runbook_name',
            'status',
            'result_message',
            'alert_payload',
            'service',
            'triggered_at',
            'completed_at',
        ]
