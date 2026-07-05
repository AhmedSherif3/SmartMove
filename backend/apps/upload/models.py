from __future__ import annotations

from django.db import models
from django.db.models import Manager
from django.conf import settings


class DataImport(models.Model):
    """The central tracker for every file uploaded to the system."""

    # Explicit Type Annotations for Static Type Checkers
    objects: Manager[DataImport] = Manager()

    class Status(models.TextChoices):
        PENDING_VIRUS_SCAN = 'PENDING_VIRUS_SCAN', 'Pending Virus Scan'
        FAILED_SECURITY_QUARANTINE = 'FAILED_SECURITY_QUARANTINE', 'Failed: Security Quarantine'
        PROCESSING_ETL = 'PROCESSING_ETL', 'Processing (ETL)'
        COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS', 'Completed with Errors'
        COMPLETED = 'COMPLETED', 'Completed'

    class Region(models.TextChoices):
        ENGLAND = 'england', 'England'
        DUBAI = 'dubai', 'Dubai'
        EGYPT = 'egypt', 'Egypt'

    class Source(models.TextChoices):
        LOCAL = 'local', 'Local Upload'
        GOOGLE = 'google', 'Google Drive'
        MICROSOFT = 'microsoft', 'Microsoft 365'

    # Core Info
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    file_name = models.CharField(max_length=255)
    region = models.CharField(max_length=20, choices=Region.choices)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.LOCAL)

    # Azure & Tracking
    azure_blob_name = models.CharField(max_length=500, blank=True, null=True)
    file_size_bytes = models.BigIntegerField(default=0)

    # Airflow Pipeline Tracking
    run_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True,
        help_text="Airflow DAG run_id used to correlate pipeline executions with uploads.",
    )

    # Status & Telemetry
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING_VIRUS_SCAN)
    total_rows = models.IntegerField(default=0)
    processed_rows = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)

    # Time & Heartbeats
    last_heartbeat = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self) -> str:
        return f"{self.file_name} ({self.status})"
