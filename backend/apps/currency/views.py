import logging
from decimal import Decimal

from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CurrencyRate

logger = logging.getLogger(__name__)

REDIS_CACHE_KEY = 'currency:rates:latest'
STALE_THRESHOLD_HOURS = 24


class LiveRatesView(APIView):
    """
    GET /api/currency/rates/

    Returns the latest consensus exchange rates with staleness metadata.

    Lookup strategy:
        1. Redis cache (populated by the oracle task, 48h TTL).
        2. Database fallback if cache is cold/missing.

    Response includes a `meta` block with data-freshness indicators
    so consumers can degrade gracefully when rates are stale.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        rates = {}
        last_updated = None
        source = None

        # ── 1. Try Redis cache first ─────────────────────────────────────
        cached = cache.get(REDIS_CACHE_KEY)
        if cached:
            source = 'cache'
            last_updated_iso = cached.pop('__last_updated', None)
            if last_updated_iso:
                try:
                    last_updated = timezone.datetime.fromisoformat(last_updated_iso)
                except (ValueError, TypeError):
                    last_updated = None

            rates = {
                code: str(value)
                for code, value in cached.items()
                if not code.startswith('__')
            }

        # ── 2. Fallback to database ──────────────────────────────────────
        if not rates:
            source = 'database'
            db_rates = CurrencyRate.objects.all()
            if db_rates.exists():
                rates = {
                    cr.currency_code: str(cr.rate_to_usd)
                    for cr in db_rates
                }
                # Use the most recent update timestamp
                latest = db_rates.order_by('-last_updated').first()
                if latest:
                    last_updated = latest.last_updated

        # ── 3. Calculate staleness ───────────────────────────────────────
        now = timezone.now()
        is_stale = True  # default to stale if we have no timestamp
        data_age_seconds = None

        if last_updated:
            # Ensure timezone-aware comparison
            if timezone.is_naive(last_updated):
                last_updated = timezone.make_aware(last_updated)
            delta = now - last_updated
            data_age_seconds = int(delta.total_seconds())
            is_stale = delta.total_seconds() > (STALE_THRESHOLD_HOURS * 3600)

        # ── 4. Build response ────────────────────────────────────────────
        if not rates:
            return Response(
                {
                    'meta': {
                        'last_updated': None,
                        'is_stale': True,
                        'provider': 'SmartMove Consensus Oracle',
                        'source': None,
                        'data_age_seconds': None,
                        'currency_count': 0,
                    },
                    'rates': {},
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                'meta': {
                    'last_updated': last_updated.isoformat() if last_updated else None,
                    'is_stale': is_stale,
                    'provider': 'SmartMove Consensus Oracle',
                    'source': source,
                    'data_age_seconds': data_age_seconds,
                    'currency_count': len(rates),
                },
                'rates': rates,
            },
            status=status.HTTP_200_OK,
        )
