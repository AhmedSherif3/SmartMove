import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class CurrencyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.currency'
    label = 'currency'

    def ready(self):
        """
        Zero-downtime cache warming.

        Connects to the post_migrate signal so the cache is warmed only
        after all apps and database tables are fully initialized — avoids
        Django's "Accessing the database during app initialization" warning.
        """
        from django.db.models.signals import post_migrate
        post_migrate.connect(self._warm_cache_signal, sender=self)

    @staticmethod
    def _warm_cache_signal(sender, **kwargs):
        """Signal handler wrapper — delegates to the actual warming logic."""
        CurrencyConfig._warm_cache()

    @staticmethod
    def _warm_cache():
        try:
            from django.core.cache import cache
            from django.utils import timezone

            from .models import CurrencyRate

            rates = CurrencyRate.objects.all()
            if not rates.exists():
                logger.debug("Cache warmer: no currency rates in DB — skipping")
                return

            cache_payload = {
                cr.currency_code: str(cr.rate_to_usd)
                for cr in rates
            }
            cache_payload['__last_updated'] = timezone.now().isoformat()

            # Use the same key + TTL the oracle task and utils.py expect
            REDIS_CACHE_KEY = 'currency:rates:latest'
            REDIS_CACHE_TTL = 48 * 60 * 60  # 48 hours

            cache.set(REDIS_CACHE_KEY, cache_payload, timeout=REDIS_CACHE_TTL)
            logger.info(
                f"Cache warmer: loaded {len(cache_payload) - 1} currency rates into Redis",
                extra={'event': 'cache_warm', 'rate_count': len(cache_payload) - 1},
            )

        except Exception as exc:
            # Silently swallow — this runs during startup and must never crash
            # the application (e.g. table doesn't exist yet, Redis is down).
            logger.debug(
                f"Cache warmer skipped (non-fatal): {exc}",
                extra={'event': 'cache_warm_skip'},
            )

