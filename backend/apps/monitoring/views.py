"""
SmartMove SOC — Alertmanager Webhook Receiver

Accepts POST requests from Alertmanager, parses the alert payload,
and dynamically dispatches self-healing runbooks for critical alerts.

Endpoint: POST /api/monitoring/webhook/alertmanager/
Auth:     Shared-secret header (``X-Alertmanager-Token``).
          Validated by ``HasAlertmanagerSecret`` — see permissions.py.
"""

import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView

from apps.users.permissions import IsSmartMoveAdmin
from .serializers import SelfHealingLogSerializer

from .metrics import self_healing_actions_total, webhook_requests_total
from .models import SelfHealingLog
from .permissions import HasAlertmanagerSecret
from .runbooks import RUNBOOK_REGISTRY

logger = logging.getLogger('apps.monitoring.views')

# Severity levels that qualify for automatic runbook dispatch
ACTIONABLE_SEVERITIES = frozenset({'critical'})


class AlertmanagerWebhookReceiver(APIView):
    """
    Receives Alertmanager webhook POST payloads and triggers self-healing
    runbooks when a matching runbook annotation exists on a critical alert.

    Security:
        Requires a valid ``X-Alertmanager-Token`` header matching the
        ``ALERTMANAGER_SECRET_TOKEN`` Django setting.  No Django session
        or JWT authentication is used — this is a machine-to-machine
        endpoint.

    Alertmanager payload shape (v2):
        {
          "status": "firing" | "resolved",
          "alerts": [
            {
              "status": "firing",
              "labels": {"alertname": "...", "severity": "critical", ...},
              "annotations": {"summary": "...", "runbook": "restart_celery_workers"},
              "startsAt": "...",
              "endsAt": "...",
              ...
            },
            ...
          ],
          ...
        }
    """
    permission_classes = [HasAlertmanagerSecret]
    authentication_classes = []  # M2M: Alertmanager uses a shared secret, not JWTs

    def post(self, request):
        payload = request.data
        alerts = payload.get('alerts', [])
        alert_group_status = payload.get('status', 'unknown')

        if not alerts:
            webhook_requests_total.labels(status_code='400').inc()
            return Response(
                {'error': 'No alerts found in payload.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(
            "Received Alertmanager webhook: status=%s, alert_count=%d",
            alert_group_status, len(alerts),
        )

        results = []

        for alert in alerts:
            labels = alert.get('labels', {})
            annotations = alert.get('annotations', {})
            alert_name = labels.get('alertname', 'unknown')
            severity = labels.get('severity', 'info')
            service = labels.get('service', '')
            alert_status = alert.get('status', 'unknown')
            runbook_name = annotations.get('runbook', '')

            # Skip resolved alerts — no action needed
            if alert_status == 'resolved':
                results.append({
                    'alert': alert_name,
                    'status': 'skipped',
                    'reason': 'Alert is resolved.',
                })
                continue

            # Only dispatch runbooks for critical severity
            if severity not in ACTIONABLE_SEVERITIES:
                log_entry = SelfHealingLog.objects.create(
                    alert_name=alert_name,
                    severity=severity,
                    runbook_name=runbook_name or 'N/A',
                    status=SelfHealingLog.Status.SKIPPED,
                    result_message=f'Severity "{severity}" below threshold.',
                    alert_payload=alert,
                    service=service,
                )
                results.append({
                    'alert': alert_name,
                    'status': 'skipped',
                    'reason': f'Severity "{severity}" is not actionable.',
                    'log_id': log_entry.pk,
                })
                continue

            # No runbook annotation → log but don't execute
            if not runbook_name:
                log_entry = SelfHealingLog.objects.create(
                    alert_name=alert_name,
                    severity=severity,
                    runbook_name='none',
                    status=SelfHealingLog.Status.SKIPPED,
                    result_message='No runbook annotation on alert.',
                    alert_payload=alert,
                    service=service,
                )
                results.append({
                    'alert': alert_name,
                    'status': 'skipped',
                    'reason': 'No runbook annotation.',
                    'log_id': log_entry.pk,
                })
                continue

            # Resolve the runbook function
            runbook_func = RUNBOOK_REGISTRY.get(runbook_name)
            if not runbook_func:
                log_entry = SelfHealingLog.objects.create(
                    alert_name=alert_name,
                    severity=severity,
                    runbook_name=runbook_name,
                    status=SelfHealingLog.Status.FAILED,
                    result_message=f'Runbook "{runbook_name}" not found in registry.',
                    alert_payload=alert,
                    service=service,
                )
                self_healing_actions_total.labels(
                    runbook=runbook_name, status='failed',
                ).inc()
                results.append({
                    'alert': alert_name,
                    'status': 'failed',
                    'reason': f'Runbook "{runbook_name}" not registered.',
                    'log_id': log_entry.pk,
                })
                continue

            # ── Execute the runbook ───────────────────────────
            log_entry = SelfHealingLog.objects.create(
                alert_name=alert_name,
                severity=severity,
                runbook_name=runbook_name,
                status=SelfHealingLog.Status.TRIGGERED,
                alert_payload=alert,
                service=service,
            )

            try:
                result_message = runbook_func(alert)
                log_entry.status = SelfHealingLog.Status.SUCCESS
                log_entry.result_message = result_message
                log_entry.completed_at = timezone.now()
                log_entry.save(update_fields=[
                    'status', 'result_message', 'completed_at',
                ])

                self_healing_actions_total.labels(
                    runbook=runbook_name, status='success',
                ).inc()

                logger.info(
                    "Runbook '%s' executed successfully for alert '%s'.",
                    runbook_name, alert_name,
                )

                results.append({
                    'alert': alert_name,
                    'status': 'success',
                    'runbook': runbook_name,
                    'message': result_message,
                    'log_id': log_entry.pk,
                })

            except Exception as exc:
                log_entry.status = SelfHealingLog.Status.FAILED
                log_entry.result_message = str(exc)
                log_entry.completed_at = timezone.now()
                log_entry.save(update_fields=[
                    'status', 'result_message', 'completed_at',
                ])

                self_healing_actions_total.labels(
                    runbook=runbook_name, status='failed',
                ).inc()

                logger.exception(
                    "Runbook '%s' failed for alert '%s': %s",
                    runbook_name, alert_name, exc,
                )

                results.append({
                    'alert': alert_name,
                    'status': 'failed',
                    'runbook': runbook_name,
                    'error': str(exc),
                    'log_id': log_entry.pk,
                })

        webhook_requests_total.labels(status_code='200').inc()

        return Response({
            'received': len(alerts),
            'results': results,
        }, status=status.HTTP_200_OK)


class SelfHealingLogListView(ListAPIView):
    """
    API endpoint for the Frontend Admin SOC Dashboard.
    Returns a list of all self-healing logs.
    """
    permission_classes = [IsSmartMoveAdmin]
    queryset = SelfHealingLog.objects.all()
    serializer_class = SelfHealingLogSerializer

