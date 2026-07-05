"""
SmartMove SOC — Self-Healing Runbooks

Each function in this module is a discrete remediation action that can be
triggered automatically by the Alertmanager webhook receiver in views.py.

Runbooks are resolved by name at runtime:
    runbook_name = alert.annotations.get('runbook')
    func = RUNBOOK_REGISTRY.get(runbook_name)

All runbooks follow the same contract:
    def runbook_function(alert: dict) -> str:
        '''Execute remediation and return a human-readable result message.'''
"""

import logging
import subprocess
from datetime import timedelta
from typing import Callable

from django.utils import timezone

logger = logging.getLogger('apps.monitoring.runbooks')


# ──────────────────────────────────────────────────────────────
# Runbook: Restart Celery Workers
# ──────────────────────────────────────────────────────────────

def restart_celery_workers(alert: dict) -> str:
    """
    Self-healing action: restart all Celery worker processes.

    In production this would issue a `supervisorctl restart` or
    `docker compose restart celery-worker`. For safety, this
    implementation logs the event and simulates the restart.

    Args:
        alert: The individual alert dict from the Alertmanager payload.

    Returns:
        Human-readable result message.
    """
    alert_name = alert.get('labels', {}).get('alertname', 'unknown')
    service = alert.get('labels', {}).get('service', 'celery')

    logger.warning(
        "Self-healing triggered: restarting Celery workers",
        extra={
            'alert_name': alert_name,
            'service': service,
            'action': 'restart_celery_workers',
        },
    )

    # ── Simulate restart command ──────────────────────────────
    # In production, uncomment and adjust the appropriate command:
    #
    # result = subprocess.run(
    #     ['supervisorctl', 'restart', 'celery-worker:*'],
    #     capture_output=True, text=True, timeout=30,
    # )
    #
    # or for Docker:
    # result = subprocess.run(
    #     ['docker', 'compose', 'restart', 'celery-worker'],
    #     capture_output=True, text=True, timeout=60,
    # )

    result_message = (
        f"[SIMULATED] Celery workers restart triggered at "
        f"{timezone.now().isoformat()} for alert '{alert_name}' "
        f"on service '{service}'."
    )

    logger.info(result_message)
    return result_message


# ──────────────────────────────────────────────────────────────
# Runbook: Flush Redis Cache
# ──────────────────────────────────────────────────────────────

def flush_redis_cache(alert: dict) -> str:
    """
    Self-healing action: flush the Django Redis cache.

    Used when stale cache entries are suspected of causing cascading
    failures (e.g., currency rate corruption, session issues).
    """
    logger.warning(
        "Self-healing triggered: flushing Redis cache",
        extra={'action': 'flush_redis_cache'},
    )

    try:
        from django.core.cache import cache
        cache.clear()
        result = f"[SUCCESS] Redis cache flushed at {timezone.now().isoformat()}."
    except Exception as exc:
        result = f"[FAILED] Redis cache flush failed: {exc}"
        logger.exception("Redis cache flush failed")

    return result


# ──────────────────────────────────────────────────────────────
# Runbook: Scale Backend Pods (Kubernetes)
# ──────────────────────────────────────────────────────────────

def scale_backend_pods(alert: dict) -> str:
    """
    Self-healing action: scale backend deployment replicas.

    Simulates a `kubectl scale` command. In production, this would
    interact with the Kubernetes API.
    """
    target_replicas = 4
    logger.warning(
        "Self-healing triggered: scaling backend pods to %d", target_replicas,
        extra={'action': 'scale_backend_pods', 'replicas': target_replicas},
    )

    result = (
        f"[SIMULATED] kubectl scale deployment/smartmove-backend "
        f"--replicas={target_replicas} at {timezone.now().isoformat()}"
    )
    return result


# ══════════════════════════════════════════════════════════════
# Runbook Registry
#
# Maps the `runbook` annotation value from Prometheus alert rules
# to the corresponding Python function.
# ══════════════════════════════════════════════════════════════

RUNBOOK_REGISTRY: dict[str, Callable[[dict], str]] = {
    'restart_celery_workers': restart_celery_workers,
    'flush_redis_cache':      flush_redis_cache,
    'scale_backend_pods':     scale_backend_pods,
}
