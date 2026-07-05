from django.apps import AppConfig


class MonitoringConfig(AppConfig):
    """
    SmartMove — Security & Observability Command Center (SOC)

    This app provides:
      • Custom Prometheus metrics for FinOps and business logic
      • Alertmanager webhook receivers for automated incident response
      • Self-healing runbooks triggered by critical alerts
      • Audit logging of all automated remediation actions
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.monitoring'
    label = 'monitoring'
    verbose_name = 'SOC Monitoring & Self-Healing'

    def ready(self):
        """Register custom Prometheus metrics on app startup."""
        # Import metrics module to ensure counters/gauges are registered
        # with the Prometheus client registry at process boot.
        from . import metrics  # noqa: F401