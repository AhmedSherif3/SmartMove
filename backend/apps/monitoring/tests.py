"""
SmartMove SOC — Tests for the Monitoring App

Covers:
  • Alertmanager webhook receiver (happy path, edge cases)
  • Runbook dispatch and registry
  • SelfHealingLog model creation
"""

import json
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from .models import SelfHealingLog
from .runbooks import RUNBOOK_REGISTRY, restart_celery_workers


class SelfHealingLogModelTest(TestCase):
    """Tests for the SelfHealingLog model."""

    def test_create_log_entry(self):
        log = SelfHealingLog.objects.create(
            alert_name='CeleryWorkerDown',
            severity='critical',
            runbook_name='restart_celery_workers',
            status='triggered',
            service='celery',
        )
        self.assertEqual(log.alert_name, 'CeleryWorkerDown')
        self.assertEqual(log.severity, 'critical')
        self.assertIsNotNone(log.triggered_at)

    def test_str_representation(self):
        log = SelfHealingLog(
            alert_name='RedisDown',
            severity='critical',
            runbook_name='flush_redis_cache',
            status='success',
        )
        self.assertIn('CRITICAL', str(log))
        self.assertIn('RedisDown', str(log))
        self.assertIn('flush_redis_cache', str(log))


class RunbookRegistryTest(TestCase):
    """Tests for the runbook registry and individual runbooks."""

    def test_registry_contains_expected_runbooks(self):
        expected = {'restart_celery_workers', 'flush_redis_cache', 'scale_backend_pods'}
        self.assertTrue(expected.issubset(set(RUNBOOK_REGISTRY.keys())))

    def test_restart_celery_workers_returns_message(self):
        alert = {
            'labels': {'alertname': 'CeleryWorkerDown', 'service': 'celery'},
            'annotations': {'runbook': 'restart_celery_workers'},
        }
        result = restart_celery_workers(alert)
        self.assertIn('SIMULATED', result)
        self.assertIn('Celery workers restart', result)


class AlertmanagerWebhookReceiverTest(TestCase):
    """Tests for the Alertmanager webhook receiver endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('alertmanager-webhook')

    def _make_payload(self, alerts, group_status='firing'):
        return {'status': group_status, 'alerts': alerts}

    def _make_alert(self, name='TestAlert', severity='critical',
                    status='firing', runbook='restart_celery_workers',
                    service='backend'):
        alert = {
            'status': status,
            'labels': {
                'alertname': name,
                'severity': severity,
                'service': service,
            },
            'annotations': {
                'summary': f'{name} is firing.',
                'description': 'Test alert description.',
            },
            'startsAt': '2026-05-08T10:00:00Z',
            'endsAt': '0001-01-01T00:00:00Z',
        }
        if runbook:
            alert['annotations']['runbook'] = runbook
        return alert

    def test_webhook_empty_alerts(self):
        """POST with empty alerts list returns 400."""
        response = self.client.post(
            self.url,
            data=json.dumps(self._make_payload([])),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_webhook_critical_alert_triggers_runbook(self):
        """Critical alert with valid runbook annotation triggers execution."""
        alert = self._make_alert()
        response = self.client.post(
            self.url,
            data=json.dumps(self._make_payload([alert])),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['received'], 1)
        self.assertEqual(data['results'][0]['status'], 'success')
        self.assertEqual(data['results'][0]['runbook'], 'restart_celery_workers')

        # Verify the log was created
        log = SelfHealingLog.objects.first()
        self.assertEqual(log.status, 'success')
        self.assertEqual(log.alert_name, 'TestAlert')
        self.assertIsNotNone(log.completed_at)

    def test_webhook_warning_severity_skips_runbook(self):
        """Warning severity does not trigger runbook execution."""
        alert = self._make_alert(severity='warning')
        response = self.client.post(
            self.url,
            data=json.dumps(self._make_payload([alert])),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()['results'][0]
        self.assertEqual(result['status'], 'skipped')

    def test_webhook_resolved_alert_is_skipped(self):
        """Resolved alerts are skipped entirely."""
        alert = self._make_alert(status='resolved')
        response = self.client.post(
            self.url,
            data=json.dumps(self._make_payload([alert])),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()['results'][0]
        self.assertEqual(result['status'], 'skipped')
        self.assertIn('resolved', result['reason'])

    def test_webhook_unknown_runbook_fails(self):
        """Alert with unregistered runbook name is logged as failed."""
        alert = self._make_alert(runbook='nonexistent_runbook')
        response = self.client.post(
            self.url,
            data=json.dumps(self._make_payload([alert])),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()['results'][0]
        self.assertEqual(result['status'], 'failed')
        self.assertIn('not registered', result['reason'])

    def test_webhook_no_runbook_annotation_skips(self):
        """Critical alert without runbook annotation is skipped."""
        alert = self._make_alert(runbook=None)
        response = self.client.post(
            self.url,
            data=json.dumps(self._make_payload([alert])),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()['results'][0]
        self.assertEqual(result['status'], 'skipped')

    def test_webhook_multiple_alerts_processed(self):
        """Multiple alerts in a single payload are all processed."""
        alerts = [
            self._make_alert(name='Alert1'),
            self._make_alert(name='Alert2', severity='warning'),
            self._make_alert(name='Alert3', status='resolved'),
        ]
        response = self.client.post(
            self.url,
            data=json.dumps(self._make_payload(alerts)),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['received'], 3)
        self.assertEqual(len(data['results']), 3)
