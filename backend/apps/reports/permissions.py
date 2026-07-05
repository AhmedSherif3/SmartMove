"""
SmartMove Reports — Custom Permissions

Machine-to-machine authentication for the Airflow → Django PDF builder
webhook.  Follows the same shared-secret pattern established in
``apps.monitoring.permissions.HasAlertmanagerSecret``.
"""

from django.conf import settings
from rest_framework import permissions


class HasAirflowSecret(permissions.BasePermission):
    """
    Validates the ``X-Airflow-API-Key`` header against
    ``settings.AIRFLOW_WEBHOOK_SECRET``.

    Fails closed: if the secret is empty or missing, all requests are denied.
    """

    message = "Forbidden. Invalid or missing X-Airflow-API-Key header."

    def has_permission(self, request, view) -> bool:
        expected = getattr(settings, 'AIRFLOW_WEBHOOK_SECRET', '')
        if not expected:
            return False

        provided = request.headers.get('X-Airflow-API-Key', '')
        return bool(provided and provided == expected)
