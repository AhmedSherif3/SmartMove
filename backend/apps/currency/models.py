from decimal import Decimal

from django.db import models


class CurrencyRate(models.Model):
    """
    High-precision exchange rate storage.

    Stores the rate of each currency relative to USD (1 USD = rate units of currency).
    Uses Decimal types throughout to prevent floating-point drift in financial calculations.
    """

    objects = models.Manager()

    currency_code = models.CharField(
        max_length=3,
        unique=True,
        primary_key=True,
        help_text="ISO 4217 currency code (e.g. EUR, GBP, JPY).",
    )
    rate_to_usd = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        help_text="How many units of this currency equal 1 USD.",
    )
    last_updated = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the most recent oracle consensus update.",
    )

    class Meta:
        ordering = ['currency_code']
        verbose_name = 'Currency Rate'
        verbose_name_plural = 'Currency Rates'

    def __str__(self) -> str:
        return f"{self.currency_code}: {self.rate_to_usd}"

    def save(self, *args, **kwargs):
        """Enforce Decimal typing on every save to guard against float contamination."""
        if not isinstance(self.rate_to_usd, Decimal):
            self.rate_to_usd = Decimal(str(self.rate_to_usd))  # type: ignore
        super().save(*args, **kwargs)
