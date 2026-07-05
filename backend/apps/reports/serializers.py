"""
SmartMove Reports — Serializers

ReportListSerializer
    Drives the paywall logic via ``can_view`` and ``can_download`` method
    fields.  The requesting user's role is passed in via serializer context.

BuildPdfRequestSerializer
    Validates the POST payload from the Airflow pipeline when triggering
    the PDF generation endpoint.
"""

from rest_framework import serializers

from .models import Report


class ReportListSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for ``GET /api/reports/``.

    Adds two computed boolean fields:
        * ``can_view``     — whether the user may preview the report.
        * ``can_download`` — whether the user may download the PDF.

    Paywall tiers (for regular ``USER`` role):
        0-2 months old  → can_view=True,  can_download=True
        2-6 months old  → can_view=True,  can_download=False
        6+  months old  → excluded from the queryset entirely

    ``DATA_ANALYST`` and ``ADMIN`` roles always get full access.
    """

    can_view = serializers.SerializerMethodField()
    can_download = serializers.SerializerMethodField()
    azure_blob_url = serializers.SerializerMethodField()
    region_display = serializers.CharField(source='get_region_display', read_only=True)

    class Meta:
        model = Report
        fields = [
            'id',
            'region',
            'region_display',
            'report_month',
            'report_year',
            'title',
            'azure_blob_url',
            'file_size_bytes',
            'generated_at',
            'can_view',
            'can_download',
        ]
        read_only_fields = fields

    # ── Helpers ───────────────────────────────────────────────────────────

    def get_azure_blob_url(self, obj: Report) -> str:
        from .services.storage import generate_sas_url
        # pyrefly: ignore [bad-argument-type]
        return generate_sas_url(obj.azure_blob_url)

    def _is_premium_user(self) -> bool:
        """True if the requesting user has DATA_ANALYST or ADMIN privileges."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return False
        role = getattr(request.user, 'role', '')
        return role.upper() in ('DATA_ANALYST', 'ADMIN')

    # ── Computed paywall fields ───────────────────────────────────────────

    def get_can_view(self, obj: Report):
        """Premium users always see everything; regular users follow age tiers."""
        if self._is_premium_user():
            return True
        if obj.age_months > 6:
            return False
        return True

    def get_can_download(self, obj: Report):
        """Premium users always download; regular users only for reports ≤ 2 months old."""
        if self._is_premium_user():
            return True
        if obj.age_months > 6:
            return False
        return obj.age_months <= 2


class BuildPdfRequestSerializer(serializers.Serializer):
    """
    Validates the POST payload from Airflow's ``trigger_django_pdf_builder``
    task.

    Expected JSON body:
        {
            "region": "dubai",
            "report_month": 5,
            "report_year": 2026,
            "html_content": "<html>...</html>"
        }
    """

    region = serializers.ChoiceField(choices=Report.Region.choices)
    report_month = serializers.IntegerField(min_value=1, max_value=12)
    report_year = serializers.IntegerField(min_value=2020, max_value=2100)
    html_content = serializers.CharField()
    azure_container = serializers.CharField(required=False, default='reports')

