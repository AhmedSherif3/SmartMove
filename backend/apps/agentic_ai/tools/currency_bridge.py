# Reaches into your currency app
from decimal import Decimal, InvalidOperation
from django.apps import apps
from apps.agentic_ai.exceptions import CurrencyConversionError

class RealEstateCurrencyBridge:
    """
    Provides a secure gateway for the Multi-Agent Swarm to run cross-border
    currency conversions using the core application's real-time exchange tables.
    """

    @classmethod
    def convert_amount(cls, amount: float, from_currency: str, to_currency: str) -> dict:
        """
        Converts a transaction price between arbitrary regional pairs (EGP, AED, GBP).
        Returns a structured dictionary indicating success, matching the Agent contract.
        """
        # Validate baseline inputs before attempting logic
        if amount <= 0:
            raise CurrencyConversionError("Conversion Error: Amount must be a positive non-zero value.")

        from_curr_clean = from_currency.strip().upper()
        to_curr_clean = to_currency.strip().upper()

        if from_curr_clean == to_curr_clean:
            return {
                "success": True,
                "original_amount": amount,
                "converted_amount": amount,
                "rate": 1.0,
                "target_currency": to_curr_clean
            }

        try:
            # Dynamic lookups against your core currency apps model state 
            # to decouple cross-app compilation dependencies
            CurrencyRateModel = apps.get_model('currency', 'ExchangeRate')
            
            # Fetch the currency rate conversion factor
            rate_record = CurrencyRateModel.objects.filter(
                source_currency=from_curr_clean,
                target_currency=to_curr_clean
            ).latest('updated_at')
            
            conversion_rate = Decimal(str(rate_record.rate))
            decimal_amount = Decimal(str(amount))
            
            final_value = float(decimal_amount * conversion_rate)

            return {
                "success": True,
                "original_amount": amount,
                "converted_amount": round(final_value, 2),
                "rate": float(conversion_rate),
                "target_currency": to_curr_clean
            }

        except LookupError:
            # Fallback handling if your currency app model configuration name drops out
            raise CurrencyConversionError("Internal Configuration Failure: Currency conversion service unavailable.")
        except Exception as e:
            raise CurrencyConversionError(
                f"Unsupported conversion pair requested: '{from_curr_clean}' to '{to_curr_clean}'. "
                f"Details: {str(e)}"
            )