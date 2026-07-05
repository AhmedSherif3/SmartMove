"""
SmartMove SOC — Custom Prometheus Metrics

Registers application-level metrics with the prometheus_client library.
These are exposed alongside django_prometheus metrics at /metrics.

Metrics:
  • openai_tokens_total          — Counter: cumulative OpenAI API token usage
  • aas_refresh_duration_seconds — Gauge:   last AAS data refresh duration
  • self_healing_actions_total   — Counter: automated runbook invocations
  • webhook_requests_total       — Counter: Alertmanager webhook calls
"""

from prometheus_client import Counter, Gauge, Histogram

# ──────────────────────────────────────────────────────────────
# FinOps Metrics
# ──────────────────────────────────────────────────────────────

openai_tokens_total = Counter(
    'openai_tokens_total',
    'Cumulative count of OpenAI API tokens consumed by SmartMove.',
    labelnames=['model', 'endpoint', 'token_type'],
)
"""
Usage:
    from apps.monitoring.metrics import openai_tokens_total
    openai_tokens_total.labels(
        model='gpt-4o',
        endpoint='chatbot',
        token_type='prompt',
    ).inc(350)
"""

# ──────────────────────────────────────────────────────────────
# AAS (Automated Analytics Service) Metrics
# ──────────────────────────────────────────────────────────────

aas_refresh_duration_seconds = Gauge(
    'aas_refresh_duration_seconds',
    'Duration in seconds of the last AAS data refresh cycle.',
    labelnames=['pipeline'],
)
"""
Usage:
    from apps.monitoring.metrics import aas_refresh_duration_seconds
    aas_refresh_duration_seconds.labels(pipeline='currency').set(12.4)
"""

# ──────────────────────────────────────────────────────────────
# Self-Healing / SOC Metrics
# ──────────────────────────────────────────────────────────────

self_healing_actions_total = Counter(
    'self_healing_actions_total',
    'Total number of automated self-healing runbook invocations.',
    labelnames=['runbook', 'status'],
)

webhook_requests_total = Counter(
    'webhook_requests_total',
    'Total Alertmanager webhook requests received by the SOC.',
    labelnames=['status_code'],
)

# ──────────────────────────────────────────────────────────────
# Request Latency (supplementary — fine-grained per-view)
# ──────────────────────────────────────────────────────────────

api_request_duration_seconds = Histogram(
    'smartmove_api_request_duration_seconds',
    'Histogram of API request durations in seconds (per view).',
    labelnames=['method', 'endpoint', 'status'],
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)
