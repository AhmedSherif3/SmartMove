"""
SmartMove Reports — Views

ReportListView   GET  /api/reports/
    Tiered paywall endpoint returning published reports with computed
    ``can_view`` and ``can_download`` flags.

BuildPdfView     POST /api/reports/build-pdf/
    Machine-to-machine endpoint called by the Airflow pipeline to convert
    HTML into a PDF, upload it to Azure Blob Storage, and persist the
    Report record.
"""

import logging

from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Report, ReportActivityLog, RegionalPipelineStatus
from .permissions import HasAirflowSecret
from .serializers import BuildPdfRequestSerializer, ReportListSerializer
from .services.pdf_engine import html_to_pdf
from .services.storage import upload_to_azure
from .metrics import report_views_total

logger = logging.getLogger('apps.reports.views')

# ── Paywall constants ────────────────────────────────────────────────────────
PREMIUM_ROLES = frozenset({'DATA_ANALYST', 'ADMIN'})
FREE_VIEW_CUTOFF_MONTHS = 6    # Regular users cannot see reports older than this
FREE_DOWNLOAD_CUTOFF_MONTHS = 2  # Regular users cannot download reports older than this


class ReportListView(generics.ListAPIView):
    """
    GET /api/reports/

    Returns published reports with computed paywall flags:

    ┌──────────────────────┬──────────┬──────────────┐
    │ Role / Age           │ can_view │ can_download  │
    ├──────────────────────┼──────────┼──────────────┤
    │ DATA_ANALYST / ADMIN │ True     │ True          │
    │ USER  (0-2 months)   │ True     │ True          │
    │ USER  (2-6 months)   │ True     │ False         │
    │ USER  (6+ months)    │ 403      │ 403           │
    └──────────────────────┴──────────┴──────────────┘

    Regular users whose *entire* visible queryset is empty (all reports are
    6+ months old) receive a 403 with an upgrade prompt.
    """

    serializer_class = ReportListSerializer

    def get_queryset(self):
        """
        Premium users and regular users both see all published reports.
        The tiered paywall is enforced at the serializer level.
        """
        qs = Report.objects.filter(is_published=True)  # type: ignore[attr-defined]
        return qs

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def list(self, request, *args, **kwargs):
        """
        Returns the list of reports, with paywall flags computed per-row.
        """
        queryset = self.filter_queryset(self.get_queryset())

        serializer = self.get_serializer(queryset, many=True)
        
        # ── Observability: log activity + increment Prometheus counters ──
        user = request.user
        role = getattr(user, 'role', 'USER').upper()
        ip = self._get_client_ip(request)
        for report in queryset:
            ReportActivityLog.objects.create(
                user=user, report=report, action='VIEW', ip_address=ip,
            )
            report_views_total.labels(region=report.region, user_role=role).inc()

        return Response(serializer.data)


class BuildPdfView(APIView):
    """
    POST /api/reports/build-pdf/

    Machine-to-machine endpoint invoked by Airflow's
    ``trigger_django_pdf_builder`` task.

    Auth: ``X-Airflow-API-Key`` header validated against
    ``settings.AIRFLOW_WEBHOOK_SECRET``.

    Payload:
        {
            "region": "dubai",
            "report_month": 5,
            "report_year": 2026,
            "html_content": "<html>...</html>"
        }

    Workflow:
        1. Validate payload
        2. Convert HTML → PDF via WeasyPrint
        3. Save PDF to local temporary storage
        4. Return 201 with the new Report metadata
    """

    permission_classes = [HasAirflowSecret]
    authentication_classes = []  # M2M: Airflow uses a shared secret, not JWTs

    def post(self, request):
        serializer = BuildPdfRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        region = serializer.validated_data['region']
        report_month = serializer.validated_data['report_month']
        report_year = serializer.validated_data['report_year']
        html_content = serializer.validated_data['html_content']
        azure_container = serializer.validated_data.get('azure_container', 'reports')

        logger.info(
            "Build PDF request received: region=%s, period=%02d/%d",
            region, report_month, report_year,
        )

        # ── 1. Convert HTML → PDF ────────────────────────────────────────
        try:
            pdf_bytes = html_to_pdf(html_content)
        except Exception as exc:
            logger.exception("PDF generation failed: %s", exc)
            return Response(
                {'error': f'PDF generation failed: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ── 2. Create / update Report record ─────────────────────────────
        region_display = dict(Report.Region.choices).get(region, region).title()
        title = f"{region_display} Executive Summary — {report_month:02d}/{report_year}"
        file_name = f"{region}_{report_year}_{report_month:02d}_summary.pdf"

        report, created = Report.objects.update_or_create(  # type: ignore[attr-defined]
            region=region,
            report_month=report_month,
            report_year=report_year,
            defaults={
                'title': title,
                'file_size_bytes': len(pdf_bytes),
                'is_published': True,
            },
        )
        
        # Save to local pdf_file
        # pyrefly: ignore [missing-attribute]
        report.pdf_file.save(file_name, ContentFile(pdf_bytes), save=True)

        # ── 3. Upload to Azure ───────────────────────────────────────────
        blob_name = f"reports/{region}/{report_year}/{report_month:02d}_executive_summary.pdf"
        if azure_container == 'reports':
            azure_container = f"{region}-reports"
        
        try:
            blob_url = upload_to_azure(pdf_bytes, blob_name, container=azure_container)
            report.azure_blob_url = blob_url
            report.save(update_fields=['azure_blob_url'])
        except Exception as exc:
            logger.exception("Azure upload failed during build-pdf: %s", exc)
            return Response(
                {'error': f'Azure storage upload failed: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        action = "created" if created else "updated"
        logger.info(
            "Report %s: %s (id=%d, size=%d bytes)",
            action, title, report.pk, len(pdf_bytes),
        )

        return Response(
            {
                'status': action,
                'report_id': report.pk,
                'title': title,
                'file_size_bytes': len(pdf_bytes),
                'azure_blob_url': report.azure_blob_url,
            },
            status=status.HTTP_201_CREATED,
        )


class UploadAzureView(APIView):
    """
    POST /api/reports/{report_id}/upload-azure/
    """
    permission_classes = [HasAirflowSecret]
    authentication_classes = []  # M2M: Airflow uses a shared secret, not JWTs

    def post(self, request, report_id):
        report = get_object_or_404(Report, pk=report_id)
        azure_container = request.data.get('azure_container', 'reports')
        if azure_container == 'reports':
            azure_container = f"{report.region}-reports"

        if not report.pdf_file:
            return Response({'error': 'No PDF file attached to this report'}, status=status.HTTP_400_BAD_REQUEST)

        pdf_bytes = report.pdf_file.read()
        blob_name = f"reports/{report.region}/{report.report_year}/{report.report_month:02d}_executive_summary.pdf"

        try:
            blob_url = upload_to_azure(pdf_bytes, blob_name, container=azure_container)
        except Exception as exc:
            logger.exception("Azure upload failed: %s", exc)
            return Response(
                {'error': f'Storage upload failed: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        report.azure_blob_url = blob_url
        report.save(update_fields=['azure_blob_url'])

        return Response({'message': 'Uploaded to Azure successfully', 'azure_blob_url': blob_url})


class DispatchEmailView(APIView):
    """
    POST /api/reports/dispatch/
    """
    permission_classes = [HasAirflowSecret]
    authentication_classes = []

    def post(self, request):
        report_id = request.data.get('report_id')
        recipients = request.data.get('recipients', [])

        if not report_id or not recipients:
            return Response({'error': 'report_id and recipients are required'}, status=status.HTTP_400_BAD_REQUEST)

        report = get_object_or_404(Report, pk=report_id)

        try:
            send_mail(
                subject=f"New Report Available: {report.title}",
                message=f"Your new report is available at: {report.azure_blob_url}",
                from_email=None,
                recipient_list=recipients,
                fail_silently=False,
            )
        except Exception as exc:
            logger.exception("Email dispatch failed: %s", exc)
            return Response({'error': f'Email dispatch failed: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'message': f'Dispatched to {len(recipients)} users'})


class PipelineStatusUpdateView(APIView):
    """
    POST /api/reports/status/update/
    """
    permission_classes = [HasAirflowSecret]
    authentication_classes = []

    def post(self, request):
        region = request.data.get('region')
        pipeline_status = request.data.get('status')

        if not region or not pipeline_status:
            return Response({'error': 'region and status are required'}, status=status.HTTP_400_BAD_REQUEST)

        status_obj, created = RegionalPipelineStatus.objects.update_or_create(
            region=region,
            defaults={'status': pipeline_status}
        )

        return Response({'message': 'Status updated'})


class ReportPreviewView(APIView):
    """
    GET /api/reports/{report_id}/preview/

    Streams the PDF report directly from Azure Blob Storage to bypass CORS.
    Enforces the same paywall restrictions as the list view.
    """
    def get(self, request, report_id):
        report = get_object_or_404(Report, pk=report_id)
        
        # Enforce paywall checks
        user = request.user
        role = getattr(user, 'role', 'USER').upper()
        if role not in ('DATA_ANALYST', 'ADMIN') and report.age_months > 6:
            return Response(
                {'error': 'This report is locked. Please upgrade to a Data Analyst tier.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        if not report.azure_blob_url:
            return Response({'error': 'No Azure URL associated with this report.'}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            from django.http import FileResponse
            from django.conf import settings
            from azure.storage.blob import BlobServiceClient
            import urllib.parse
            
            conn_str = str(settings.AZURE_STORAGE_CONNECTION_STRING)
            blob_url = report.azure_blob_url
            
            parts = blob_url.split('.blob.core.windows.net/', 1)
            if len(parts) < 2:
                return Response({'error': 'Invalid Azure URL structure.'}, status=status.HTTP_400_BAD_REQUEST)
                
            path_part = parts[1]
            path_parts = path_part.split('/', 1)
            if len(path_parts) < 2:
                return Response({'error': 'Invalid Azure path structure.'}, status=status.HTTP_400_BAD_REQUEST)
                
            container_name = urllib.parse.unquote(path_parts[0])
            blob_name = urllib.parse.unquote(path_parts[1])
            
            blob_service = BlobServiceClient.from_connection_string(conn_str)
            blob_client = blob_service.get_blob_client(container=container_name, blob=blob_name)
            
            # Stream the PDF bytes directly
            stream = blob_client.download_blob()
            return FileResponse(
                stream.chunks(), 
                content_type='application/pdf',
                filename=f"{report.region}_{report.report_year}_{report.report_month:02d}_summary.pdf"
            )
        except Exception as exc:
            logger.exception("Failed to proxy preview for report %d: %s", report_id, exc)
            return Response(
                {'error': f'Failed to retrieve report preview: {str(exc)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

