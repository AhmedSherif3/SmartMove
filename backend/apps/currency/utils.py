"""
Universal Decimal Converter.

Converts monetary amounts between currencies using high-precision Decimal math.
Lookup strategy: Redis cache → Database → Fallback to 1.0 (same-as-USD).
"""

import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.core.cache import cache

from .models import CurrencyRate

logger = logging.getLogger(__name__)

REDIS_CACHE_KEY = 'currency:rates:latest'


def _get_rate(currency_code: str) -> Decimal:
    """
    Resolve the USD rate for a currency code.

    Lookup chain:
        1. Redis cache (fastest, populated by the oracle task).
        2. Database (authoritative, slightly slower).
        3. Fallback to Decimal('1.0') — treats unknown currencies as 1:1 with USD.
    """
    code = currency_code.upper().strip()

    # USD is always 1.0
    if code == 'USD':
        return Decimal('1.0')

    # ── 1. Check Redis ────────────────────────────────────────────────────
    cached = cache.get(REDIS_CACHE_KEY)
    if cached and code in cached:
        try:
            rate = Decimal(str(cached[code]))
            logger.debug(f"Cache hit for {code}: {rate}")
            return rate
        except (InvalidOperation, ValueError):
            logger.warning(f"Corrupt cache entry for {code}, falling through to DB")

    # ── 2. Check Database ─────────────────────────────────────────────────
    try:
        db_rate = CurrencyRate.objects.get(currency_code=code)
        rate = Decimal(str(db_rate.rate_to_usd))
        logger.debug(f"DB hit for {code}: {rate}")
        return rate
    except CurrencyRate.DoesNotExist:
        pass
    except Exception as exc:
        # Database unreachable — log and fall through to the safe default
        logger.error(
            f"DB lookup failed for {code} (falling back to 1.0): {exc}",
            extra={'currency': code, 'event': 'db_lookup_error'},
        )

    # ── 3. Fallback ───────────────────────────────────────────────────────
    logger.warning(
        f"No rate found for {code} — falling back to 1.0",
        extra={'currency': code, 'event': 'rate_fallback'},
    )
    return Decimal('1.0')


def convert_value(
    amount: str | int | float | Decimal,
    from_currency: str,
    to_currency: str,
    precision: int = 6,
) -> Decimal:
    """
    Convert an amount between two currencies using high-precision Decimal math.

    Args:
        amount: The monetary value to convert.
        from_currency: ISO 4217 source currency code (e.g. "EUR").
        to_currency: ISO 4217 target currency code (e.g. "GBP").
        precision: Number of decimal places for rounding (default 6).

    Returns:
        Decimal result rounded to the specified precision.
        Falls back to the unconverted amount if all lookups fail.

    Example:
        >>> convert_value('100.50', 'EUR', 'GBP')
        Decimal('86.123456')
    """
    try:
        # Enforce explicit Decimal casting for all parameters
        amount_d = Decimal(str(amount))
        from_rate = Decimal(str(_get_rate(from_currency)))
        to_rate = Decimal(str(_get_rate(to_currency)))

        # Math: convert from_currency → USD → to_currency
        # amount_in_usd = amount / from_rate
        # result = amount_in_usd * to_rate
        result = (amount_d / from_rate) * to_rate

        # Round to the requested precision
        quantizer = Decimal(10) ** -precision  # e.g. Decimal('0.000001')
        return result.quantize(quantizer, rounding=ROUND_HALF_UP)

    except Exception as exc:
        # Safety net: if Redis is down AND DB is unreachable, never throw a
        # 500 — return the unconverted amount so callers degrade gracefully.
        logger.error(
            f"convert_value failed ({from_currency}→{to_currency}), "
            f"returning unconverted amount: {exc}",
            extra={
                'from_currency': from_currency,
                'to_currency': to_currency,
                'event': 'conversion_fallback',
            },
        )
        try:
            return Decimal(str(amount))
        except (InvalidOperation, ValueError):
            return Decimal('0')


def get_live_rates() -> dict[str, str]:
    """
    Return a dict of all available currency rates as ``{code: rate_to_usd}``.

    Lookup chain: Redis cache → Database → empty dict.

    Used by the chatbot prompt assembly to inject live exchange-rate
    context into the LLM system prompt.
    """
    # ── 1. Try Redis cache ────────────────────────────────────────────────
    cached = cache.get(REDIS_CACHE_KEY)
    if cached:
        return {
            code: str(value)
            for code, value in cached.items()
            if not str(code).startswith('__')
        }

    # ── 2. Fallback to database ──────────────────────────────────────────
    try:
        db_rates = CurrencyRate.objects.all()
        if db_rates.exists():
            return {cr.currency_code: str(cr.rate_to_usd) for cr in db_rates}
    except Exception as exc:
        logger.error(
            f'get_live_rates DB fallback failed: {exc}',
            extra={'event': 'live_rates_error'},
        )

    return {}
