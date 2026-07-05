from __future__ import annotations

import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Sum
from azure.storage.blob import BlobServiceClient

from prometheus_client import Counter

from ..users.permissions import IsSmartMoveAdmin
from .models import DataImport
from .serializers import DataImportSerializer, SASTokenRequestSerializer
from . import azure_utils

# Cross-app import: Storage quota enforcement via the subscriptions Tri-Layer math
from apps.subscriptions.models import CustomerProfile

logger = logging.getLogger(__name__)

SAS_TOKENS_GENERATED = Counter('sas_tokens_generated_total', 'Total SAS tokens generated for uploads')
UPLOADS_REGISTERED = Counter('uploads_registered_total', 'Total uploads registered')

# Bytes-per-GB constant for quota math
_BYTES_PER_GB: int = 1_073_741_824


def _check_storage_quota(user: Any, incoming_file_size_bytes: int) -> tuple[bool, int, int]:
    """
    Validate an upload against the user's Tri-Layer storage quota.

    Returns:
        (is_allowed, total_allowance_bytes, current_usage_bytes)
    """
    # 1. Get the user's total allowance from the subscriptions Tri-Layer math
    try:
        profile: CustomerProfile = user.stripe_profile  # type: ignore[attr-defined]
        total_allowance_gb: int = profile.get_total_storage_allowance()
    except CustomerProfile.DoesNotExist:
        # No stripe profile yet — default to free-tier base (1 GB)
        total_allowance_gb = 1

    total_allowance_bytes: int = total_allowance_gb * _BYTES_PER_GB

    # 2. Sum current usage from all non-failed uploads
    current_usage: int = int(
        DataImport.objects.filter(
            uploaded_by=user,
        ).exclude(
            status__in=['FAILED_SECURITY_QUARANTINE'],
        ).aggregate(
            total=Sum('file_size_bytes')
        )['total'] or 0
    )

    # 3. Check if the new file would exceed the quota
    is_allowed: bool = (current_usage + incoming_file_size_bytes) <= total_allowance_bytes

    return is_allowed, total_allowance_bytes, current_usage


class GenerateSASTokenView(APIView):
    """Step 1: Gives Next.js the secure link to bypass Django and upload straight to Azure."""
    permission_classes = [IsSmartMoveAdmin]

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = SASTokenRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        region: str = serializer.validated_data['region']
        file_name: str = serializer.validated_data['filename']
        file_size_bytes: int = int(serializer.validated_data.get('file_size_bytes', 0))

        # ── Storage Quota Gate ────────────────────────────────────────────
        # Enforce the Tri-Layer math before issuing a SAS token
        if file_size_bytes > 0:
            is_allowed, allowance, usage = _check_storage_quota(request.user, file_size_bytes)
            if not is_allowed:
                return Response(
                    {
                        'error': 'Storage quota exceeded.',
                        'detail': (
                            f'Your plan allows {allowance // _BYTES_PER_GB} GB. '
                            f'Current usage: {usage / _BYTES_PER_GB:.2f} GB. '
                            f'Requested upload: {file_size_bytes / _BYTES_PER_GB:.2f} GB. '
                            'Please upgrade your storage plan or delete existing files.'
                        ),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Route to the correct Azure landing bucket
        container: str = azure_utils.get_container_name(region)

        # Security: Scope the blob path specifically to this exact upload attempt
        blob_name: str = (
            f"imports/{datetime.now(tz=timezone.utc).strftime('%Y-%m')}/"
            f"{request.user.id}_{uuid.uuid4().hex[:8]}_{file_name}"
        )

        # Generate a real SAS URL with 4-hour write-only access
        sas_url: str = azure_utils.generate_sas_url(blob_name=blob_name, container=container)

        SAS_TOKENS_GENERATED.inc()

        logger.info(
            f"SAS token generated for {file_name}",
            extra={'user_id': request.user.id, 'region': region, 'blob_name': blob_name},
        )

        return Response({
            "sas_url": sas_url,
            "blob_name": blob_name,
        }, status=status.HTTP_200_OK)


class RegisterUploadView(APIView):
    """Step 2: Next.js calls this after the Azure upload finishes. Registers in DB for Airflow."""
    permission_classes = [IsSmartMoveAdmin]

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        # Input validation
        blob_url: str | None = request.data.get('blob_url')
        region: str | None = request.data.get('region')
        file_size_bytes: int = int(request.data.get('file_size_bytes', 0))

        if not all([blob_url, region]):
            return Response(
                {'error': 'blob_url and region are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Storage Quota Gate (belt-and-suspenders) ──────────────────────
        # Re-check quota even after SAS token was issued, in case concurrent
        # uploads pushed the user over the limit between Step 1 and Step 2.
        is_allowed, allowance, usage = _check_storage_quota(request.user, file_size_bytes)
        if not is_allowed:
            return Response(
                {
                    'error': 'Storage quota exceeded.',
                    'detail': (
                        f'Your plan allows {allowance // _BYTES_PER_GB} GB total. '
                        f'Upgrade your plan to upload more data.'
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Extract blob_name from URL (everything after the container name)
        assert region is not None
        container: str = azure_utils.get_container_name(region)
        assert blob_url is not None
        try:
            # simple split to get blob name
            blob_name: str = blob_url.split(f"/{container}/")[1].split('?')[0]
        except IndexError:
            # fallback if URL structure is weird or container name doesn't match
            blob_name = blob_url.split('/')[-1].split('?')[0]

        file_name: str = blob_name.split('/')[-1]

        # 1. Verify blob actually exists in Azure before creating a DB record
        try:
            conn_str: str = azure_utils._get_connection_string()
            blob_service = BlobServiceClient.from_connection_string(conn_str)
            blob_client = blob_service.get_blob_client(
                container=container, blob=blob_name
            )
            if not blob_client.exists():
                return Response(
                    {'error': 'Blob not found in Azure. Upload may have failed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(
                f"Azure blob verification failed: {e}",
                extra={'user_id': request.user.id, 'blob_name': blob_name},
            )
            return Response(
                {'error': f'Failed to verify blob in Azure: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 2. Create the Database Tracker
        import_job = DataImport.objects.create(
            uploaded_by=request.user,
            file_name=file_name,
            region=region,
            azure_blob_name=blob_name,
            file_size_bytes=file_size_bytes,
            source='local',
            status='PENDING_VIRUS_SCAN',
        )

        UPLOADS_REGISTERED.inc()

        logger.info(
            f"Upload registered: {file_name} — Handing off to Airflow",
            extra={
                'user_id': request.user.id,
                'region': region,
                'file_name': file_name,
                'import_id': import_job.id,
            },
        )

        notify_users = request.data.get('notify_users', False)
        if str(notify_users).lower() in ['true', '1', 'yes']:
            from apps.notifications.services import create_notification
            from django.contrib.auth import get_user_model
            User = get_user_model()
            all_users = User.objects.filter(is_active=True)
            if region:
                all_users = all_users.filter(region=region)
            for u in all_users.iterator():
                create_notification(
                    user=u,
                    title='Dashboard Data Updated',
                    message=f'New data for {region.title() if region else "all regions"} has been imported. Your dashboards now reflect the latest market information.',
                    notification_type='system',
                    priority='info',
                    icon='data',
                    link='/market-trends',
                    source_app='admin_data_import',
                )

        return Response(DataImportSerializer(import_job).data, status=status.HTTP_202_ACCEPTED)


class WebhookView(APIView):
    """Webhook for Apache Airflow to notify us of status changes."""
    permission_classes: list[Any] = []  # Disable default permissions for Airflow
    authentication_classes: list[Any] = []  # Disable default authentication

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        # 1. Custom Security Check
        airflow_key: str | None = request.headers.get('X-Airflow-API-Key')
        expected_key: str = str(getattr(settings, 'AIRFLOW_WEBHOOK_SECRET', ''))

        if not airflow_key or airflow_key != expected_key:
            logger.warning(
                f"Unauthorized Webhook attempt. Key provided: {'Yes' if airflow_key else 'No'}"
            )
            return Response(
                {'error': 'Forbidden. Invalid or missing X-Airflow-API-Key header.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        import_id: str | None = request.data.get('import_id')
        new_status: str | None = request.data.get('status')
        error_message: str = str(request.data.get('error_message', ''))
        processed_rows: int = int(request.data.get('processed_rows', 0))
        total_rows: int = int(request.data.get('total_rows', 0))

        if not all([import_id, new_status]):
            return Response(
                {'error': 'import_id and status are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            import_job = DataImport.objects.get(id=import_id)
        except ObjectDoesNotExist:
            return Response(
                {'error': f'DataImport {import_id} not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        import_job.status = str(new_status)
        if error_message:
            import_job.error_message = error_message
        if processed_rows:
            import_job.processed_rows = processed_rows
        if total_rows:
            import_job.total_rows = total_rows

        if new_status in ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED_SECURITY_QUARANTINE']:
            import_job.completed_at = datetime.now(tz=timezone.utc)

        import_job.save()

        logger.info(
            f"Airflow webhook received for import {import_id} - New status: {new_status}",
            extra={'import_id': import_id, 'new_status': new_status},
        )

        return Response({'status': 'success'}, status=status.HTTP_200_OK)


class ImportListView(generics.ListAPIView):
    """Populates the Next.js Recent Imports Table."""
    queryset = DataImport.objects.all().order_by('-created_at')
    serializer_class = DataImportSerializer
    permission_classes = [IsSmartMoveAdmin]