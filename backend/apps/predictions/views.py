"""
Forecast API View — apps.predictions
======================================
DRF ``APIView`` that serves forecast data from the ``fact_forecasts``
table, with **role-based access control (RBAC)** on the forecast
horizon:

  • ``USER``         → max 36 months into the future
  • ``DATA_ANALYST`` → max 120 months
  • ``ADMIN``        → max 120 months
"""

import logging
from datetime import date
from dateutil.relativedelta import relativedelta

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Forecast
from .serializers import ForecastSerializer

logger = logging.getLogger(__name__)

# ── Horizon Limits (months) ──────────────────────────────────────────────────
_HORIZON_BY_ROLE: dict[str, int] = {
    "USER": 36,
    "DATA_ANALYST": 120,
    "ADMIN": 120,
}
_DEFAULT_HORIZON = 36


class ForecastAPIView(APIView):
    """
    GET /api/predictions/forecasts/

    Query Parameters:
        region (str, required)  — e.g. ``Dubai``, ``Egypt``, ``England``
        area   (str, optional)  — e.g. ``Downtown Dubai``
        scenario (str, optional) — ``Normal``, ``Best_Case``, ``Worst_Case``

    RBAC:
        The maximum forecast horizon returned depends on the
        authenticated user's role.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        region = request.query_params.get("region")
        area = request.query_params.get("area")
        scenario = request.query_params.get("scenario")

        if not region:
            return Response(
                {"error": "The 'region' query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Determine horizon based on user role ─────────────────────────
        user_role = getattr(request.user, "role", "USER")
        horizon_months = _HORIZON_BY_ROLE.get(
            str(user_role).upper(), _DEFAULT_HORIZON
        )
        max_date = date.today() + relativedelta(months=horizon_months)

        logger.info(
            "Forecast request: region=%s, role=%s, horizon=%d months",
            region,
            user_role,
            horizon_months,
            extra={"event": "forecast_api_request"},
        )  # fmt: skip

        # ── Build queryset ───────────────────────────────────────────────
        qs = Forecast.objects.filter(  # type: ignore[union-attr]
            region__iexact=region,
            date__gte=date.today(),
            date__lte=max_date,
        )
        if area:
            qs = qs.filter(area__iexact=area)
        if scenario:
            qs = qs.filter(scenario__iexact=scenario)

        qs = qs.order_by("date")

        serializer = ForecastSerializer(qs, many=True)
        results = serializer.data
        return Response(
            {
                "region": region,
                "horizon_months": horizon_months,
                "count": len(results),
                "results": results,
            },
            status=status.HTTP_200_OK,
        )
