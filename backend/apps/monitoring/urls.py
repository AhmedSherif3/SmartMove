"""
SmartMove SOC — URL Configuration for apps.monitoring

Routes:
  POST /api/monitoring/webhook/alertmanager/  → AlertmanagerWebhookReceiver
"""

from django.urls import path

from .views import AlertmanagerWebhookReceiver, SelfHealingLogListView

urlpatterns = [
    path(
        'webhook/alertmanager/',
        AlertmanagerWebhookReceiver.as_view(),
        name='alertmanager-webhook',
    ),
    path(
        'logs/',
        SelfHealingLogListView.as_view(),
        name='soc-logs',
    ),
]