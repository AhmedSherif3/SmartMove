from __future__ import annotations

"""
Airflow Distribution Endpoints
==============================
Internal API views accessed by Apache Airflow to fetch regional mailing
lists for automated report distribution pipelines.

Security:
    Authenticated via the shared AIRFLOW_WEBHOOK_SECRET header, identical
    to the upload app's Airflow webhook pattern.

Performance:
    Uses optimized ORM queries with Q() objects. The underlying indexes
    on Subscription(plan_type, status) and Subscription(user, status)
    ensure these queries remain performant at scale.
"""

import logging
from typing import Any

from django.conf import settings
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

from .models import Subscription

logger = logging.getLogger(__name__)


class AirflowMailingListView(APIView):
    """
    GET /api/subscriptions/api/airflow/mailing-list/?region=dubai

    Returns a list of user emails eligible for a given region's report
    distribution. Airflow calls this endpoint at the start of each
    regional pipeline run to build the recipient list.

    Eligibility Logic:
        A user receives the region's report if they have ANY of these
        active subscriptions:
        • mail_{region}       — individual regional mailer
        • mail_all_regions    — all-regions bundle
        • premium_bundle      — premium bundle includes all mailers

    Query Parameters:
        region (required): One of 'egypt', 'dubai', 'uk'

    Response:
        {
            "region": "dubai",
            "count": 42,
            "recipients": [
                {"user_id": 1, "email": "user@example.com"},
                ...
            ]
        }
    """
    # Disable DRF auth — Airflow authenticates via shared secret header
    authentication_classes: list[Any] = []
    permission_classes: list[Any] = []

    _VALID_REGIONS: set[str] = {'egypt', 'dubai', 'uk'}

    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        # ── 1. Shared-secret authentication ───────────────────────────────
        airflow_key: str | None = request.headers.get('X-Airflow-API-Key')
        expected_key: str = str(getattr(settings, 'AIRFLOW_WEBHOOK_SECRET', ''))

        if not airflow_key or not expected_key or airflow_key != expected_key:
            logger.warning(
                "Unauthorized Airflow mailing-list request",
                extra={'event': 'airflow_auth_fail'},
            )
            return Response(
                {'error': 'Forbidden. Invalid or missing X-Airflow-API-Key header.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── 2. Validate region parameter ──────────────────────────────────
        region: str | None = request.query_params.get('region')
        if not region or region not in self._VALID_REGIONS:
            return Response(
                {'error': f'Invalid region. Must be one of: {", ".join(sorted(self._VALID_REGIONS))}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 3. Build optimized query with indexed fields ──────────────────
        # Uses the composite index on (plan_type, status) defined in the
        # Subscription model's Meta.indexes.
        region_mail_type: str = f'mail_{region}'

        eligible_user_ids = (
            Subscription.objects.filter(
                Q(plan_type=region_mail_type)
                | Q(plan_type='mail_all_regions')
                | Q(plan_type='premium_bundle'),
                status__in=['active', 'trialing'],
            )
            .values_list('user_id', flat=True)
            .distinct()
        )

        # ── 4. Fetch user details in a single query ──────────────────────
        from apps.users.models import User

        recipients: list[dict[str, Any]] = list(
            User.objects.filter(id__in=eligible_user_ids)
            .values('id', 'email')
        )

        logger.info(
            f"Airflow mailing list fetched for region={region}",
            extra={
                'event': 'airflow_mailing_list',
                'region': region,
                'recipient_count': len(recipients),
            },
        )

        return Response({
            'region': region,
            'count': len(recipients),
            'recipients': [
                {'user_id': r['id'], 'email': r['email']}
                for r in recipients
            ],
        }, status=status.HTTP_200_OK)


class SubscriptionMatrixFilterView(APIView):
    """
    POST /api/subscriptions/matrix/
    
    Payload: {"target_region": "egypt"}
    Returns: {"emails": ["user1@mail.com", "user2@mail.com"]}
    """
    authentication_classes: list[Any] = []
    permission_classes: list[Any] = []

    _VALID_REGIONS: set[str] = {'egypt', 'dubai', 'uk', 'england'}

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        airflow_key: str | None = request.headers.get('X-Airflow-API-Key')
        expected_key: str = str(getattr(settings, 'AIRFLOW_WEBHOOK_SECRET', ''))

        if not airflow_key or not expected_key or airflow_key != expected_key:
            return Response(
                {'error': 'Forbidden. Invalid or missing X-Airflow-API-Key header.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        target_region = request.data.get('target_region')  # type: ignore
        if not target_region or target_region not in self._VALID_REGIONS:
            return Response({'error': 'Invalid target_region'}, status=status.HTTP_400_BAD_REQUEST)

        region_mail_type: str = f'mail_{target_region}'

        eligible_user_ids = (
            Subscription.objects.filter(
                Q(plan_type=region_mail_type)
                | Q(plan_type='mail_all_regions')
                | Q(plan_type='premium_bundle'),
                status__in=['active', 'trialing'],
            )
            .values_list('user_id', flat=True)
            .distinct()
        )

        from apps.users.models import User
        emails = list(User.objects.filter(id__in=eligible_user_ids).values_list('email', flat=True))

        return Response({'emails': emails}, status=status.HTTP_200_OK)
