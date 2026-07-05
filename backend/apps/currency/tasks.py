"""
Celery task: Consensus Oracle for exchange rate fetching.

Architecture:
    1. Concurrently fetches from 3 free-tier FX APIs via httpx + asyncio.
    2. Calculates the median rate per currency across successful responses.
    3. Discards any single-source rate that deviates >2% from median (Data Poisoning Protection).
    4. Detects anomalies: warns if the new consensus rate shifted >5% from the stored DB value.
    5. Atomically upserts all rates and caches them in Redis (48h TTL).
"""

import asyncio
import logging
import statistics
from decimal import Decimal, InvalidOperation

import httpx
import redis as redis_lib
from celery import shared_task
from prometheus_client import Counter
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from .models import CurrencyRate

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────
ORACLE_SUCCESS_METRIC = Counter('currency_oracle_success_total', 'Number of successful daily currency oracle runs')

REDIS_CACHE_KEY = 'currency:rates:latest'
REDIS_CACHE_TTL = 48 * 60 * 60  # 48 hours in seconds

LOCK_KEY = 'lock:currency_oracle'
LOCK_TIMEOUT = 60  # seconds — auto-release if worker dies mid-run

API_TIMEOUT = 15  # seconds per request
MAX_DEVIATION_FROM_MEDIAN = Decimal('0.02')   # 2 % — data poisoning threshold
ANOMALY_SHIFT_THRESHOLD = Decimal('0.05')     # 5 % — anomaly alert threshold

# Free-tier API endpoints (USD base)
API_URLS = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.exchangerate-api.com/v4/latest/USD',
    'https://api.frankfurter.app/latest?from=USD',
]


# ──────────────────────────────────────────────────────────────────────────────
# Async fetchers
# ──────────────────────────────────────────────────────────────────────────────
async def _fetch_from_api(client: httpx.AsyncClient, url: str) -> dict | None:
    """
    Fetch rates from a single API endpoint.
    Returns a dict of {currency_code: Decimal(rate)} or None on failure.
    """
    try:
        response = await client.get(url, timeout=API_TIMEOUT)
        response.raise_for_status()
        data = response.json()

        # Each provider uses a slightly different key for the rates dict.
        raw_rates = data.get('rates', {})
        if not raw_rates:
            logger.warning(f"Empty rates payload from {url}")
            return None

        # Cast every value to Decimal immediately
        parsed: dict[str, Decimal] = {}
        for code, value in raw_rates.items():
            try:
                parsed[code.upper()] = Decimal(str(value))
            except (InvalidOperation, ValueError):
                continue  # skip unparseable entries

        logger.info(
            f"Fetched {len(parsed)} rates from {url}",
            extra={'source_url': url, 'rate_count': len(parsed)},
        )
        return parsed

    except httpx.HTTPStatusError as exc:
        logger.error(
            f"HTTP {exc.response.status_code} from {url}",
            extra={'source_url': url, 'status_code': exc.response.status_code},
        )
    except httpx.RequestError as exc:
        logger.error(
            f"Network error fetching {url}: {exc}",
            extra={'source_url': url},
        )
    except Exception as exc:
        logger.exception(
            f"Unexpected error fetching {url}: {exc}",
            extra={'source_url': url},
        )
    return None


async def _fetch_all_sources() -> list[dict[str, Decimal]]:
    """Hit all API sources concurrently and return the list of successful results."""
    async with httpx.AsyncClient() as client:
        tasks = [_fetch_from_api(client, url) for url in API_URLS]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    successful = []
    for result in results:
        if isinstance(result, dict):
            successful.append(result)
        elif isinstance(result, Exception):
            logger.error(f"Gather-level exception: {result}")
    return successful


# ──────────────────────────────────────────────────────────────────────────────
# Oracle logic
# ──────────────────────────────────────────────────────────────────────────────
def _compute_consensus(source_rates: list[dict[str, Decimal]]) -> dict[str, Decimal]:
    """
    For each currency present in ≥2 sources, compute the median rate.
    Then discard any individual source rate that deviates >2% from the median
    (data-poisoning protection).  Re-compute the final consensus from the
    remaining clean values.
    """
    # Collect per-currency values across all sources
    currency_values: dict[str, list[Decimal]] = {}
    for source in source_rates:
        for code, rate in source.items():
            currency_values.setdefault(code, []).append(rate)

    consensus: dict[str, Decimal] = {}
    for code, values in currency_values.items():
        if len(values) < 2:
            # Only one source — still accept, but with lower confidence
            consensus[code] = values[0]
            continue

        # Step 1: Raw median
        median = Decimal(str(statistics.median([float(v) for v in values])))

        # Step 2: Filter out poisoned values (>2% deviation from median)
        clean = []
        for v in values:
            if median == 0:
                clean.append(v)
                continue
            deviation = abs(v - median) / median
            if deviation <= MAX_DEVIATION_FROM_MEDIAN:
                clean.append(v)
            else:
                logger.warning(
                    f"Data poisoning filter: {code} rate {v} deviates "
                    f"{deviation:.2%} from median {median} — discarded",
                    extra={'currency': code, 'discarded_rate': str(v),
                           'median': str(median), 'deviation': f'{deviation:.4f}'},
                )

        # Step 3: Final consensus from clean values
        if clean:
            consensus[code] = Decimal(
                str(statistics.median([float(v) for v in clean]))
            ).quantize(Decimal('0.000001'))
        else:
            # All values poisoned — fall back to raw median
            consensus[code] = median.quantize(Decimal('0.000001'))

    return consensus


def _detect_anomalies(
    consensus: dict[str, Decimal],
    existing: dict[str, Decimal],
) -> None:
    """
    Compare new consensus rates against existing DB rates.
    Emit logger.warning for any absolute shift > 5%.
    """
    for code, new_rate in consensus.items():
        old_rate = existing.get(code)
        if old_rate is None or old_rate == 0:
            continue

        shift = abs(new_rate - old_rate) / old_rate
        if shift > ANOMALY_SHIFT_THRESHOLD:
            logger.warning(
                f"ANOMALY DETECTED: {code} shifted {shift:.2%} "
                f"(old={old_rate}, new={new_rate})",
                extra={
                    'currency': code,
                    'old_rate': str(old_rate),
                    'new_rate': str(new_rate),
                    'shift_pct': f'{shift:.4f}',
                    'event': 'currency_anomaly',
                },
            )


# ──────────────────────────────────────────────────────────────────────────────
# Celery task
# ──────────────────────────────────────────────────────────────────────────────
@shared_task(
    name='apps.currency.tasks.fetch_daily_exchange_rates',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def fetch_daily_exchange_rates(self):
    """
    Daily Consensus Oracle: fetches, validates, and persists exchange rates.

    Circuit-breaker behaviour:
        - Retries up to 3 times with 60 s backoff on transient failures.
        - Requires ≥1 successful API source to proceed.

    Distributed locking:
        - Acquires a Redis mutex (lock:currency_oracle, 60s TTL) to prevent
          concurrent runs across multiple workers.  Returns early if the
          lock is already held.
    """
    # ── 0. Distributed lock (mutex) ──────────────────────────────────────
    redis_client = redis_lib.Redis.from_url(str(settings.REDIS_URL))
    lock_acquired = redis_client.set(LOCK_KEY, 'running', nx=True, ex=LOCK_TIMEOUT)

    if not lock_acquired:
        logger.warning(
            "Oracle run skipped — lock already held by another worker",
            extra={'event': 'oracle_lock_contention'},
        )
        return "Already running"

    try:
        logger.info("Oracle run started", extra={'event': 'oracle_start'})

        # ── 1. Async fetch from all sources ──────────────────────────────
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            source_rates = loop.run_until_complete(_fetch_all_sources())
            loop.close()
        except Exception as exc:
            logger.exception(f"Failed to fetch sources: {exc}")
            raise self.retry(exc=exc)

        if not source_rates:
            logger.error(
                "Circuit breaker OPEN: all API sources failed",
                extra={'event': 'circuit_breaker_open'},
            )
            raise self.retry(exc=RuntimeError("All API sources failed"))

        logger.info(
            f"Oracle received data from {len(source_rates)}/{len(API_URLS)} sources",
            extra={'successful_sources': len(source_rates), 'total_sources': len(API_URLS)},
        )

        # ── 2. Compute consensus ─────────────────────────────────────────
        consensus = _compute_consensus(source_rates)
        if not consensus:
            logger.error("Consensus produced zero rates — aborting")
            return

        # ── 3. Anomaly detection against existing DB values ──────────────
        existing_rates = {
            cr.currency_code: cr.rate_to_usd
            for cr in CurrencyRate.objects.all()
        }
        _detect_anomalies(consensus, existing_rates)

        # ── 4. Atomic upsert ─────────────────────────────────────────────
        updated = 0
        created = 0
        with transaction.atomic():  # type: ignore
            for code, rate in consensus.items():
                _, was_created = CurrencyRate.objects.update_or_create(
                    currency_code=code,
                    defaults={'rate_to_usd': rate},
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

        logger.info(
            f"DB upsert complete: {created} created, {updated} updated",
            extra={'created': created, 'updated': updated},
        )

        # ── 5. Cache to Redis (48h TTL) ──────────────────────────────────
        cache_payload = {
            code: str(rate) for code, rate in consensus.items()
        }
        cache_payload['__last_updated'] = timezone.now().isoformat()
        cache.set(REDIS_CACHE_KEY, cache_payload, timeout=REDIS_CACHE_TTL)
        logger.info(
            f"Cached {len(consensus)} rates to Redis (TTL={REDIS_CACHE_TTL}s)",
            extra={'cached_count': len(consensus)},
        )

        # ── 6. Broadcast via Pusher ─────────────────────────────
        try:
            from apps.chatbot.services.pusher_service import get_pusher_client
            pusher = get_pusher_client()
            if pusher is not None:
                pusher.trigger(
                    'global-currency-updates',
                    'currency-updated',
                    {
                        'timestamp': str(timezone.now()),
                    },
                )
                logger.info(
                    "Broadcasted currency_updated to Pusher",
                    extra={'event': 'pusher_broadcast'},
                )
        except Exception as ws_exc:
            # Non-fatal: don't let a Pusher failure crash the oracle
            logger.warning(
                f"Pusher broadcast failed (non-fatal): {ws_exc}",
                extra={'event': 'pusher_broadcast_error'},
            )

        # Increment Prometheus counter for successful_oracle_run
        ORACLE_SUCCESS_METRIC.inc()

        logger.info("Oracle run completed successfully", extra={'event': 'oracle_complete'})

    finally:
        # Always release the distributed lock
        redis_client.delete(LOCK_KEY)
        logger.debug("Oracle lock released", extra={'event': 'oracle_lock_released'})
