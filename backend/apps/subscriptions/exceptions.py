# Custom app-specific error handling for subscription errors
class SubscriptionError(Exception):
    """Base exception for all subscription-related failures."""
    pass

class QuotaExceededError(SubscriptionError):
    """Raised when an upload exceeds the user's Tri-Layer MinIO allowance."""
    pass

class CancellationFailedError(SubscriptionError):
    """Raised when Stripe fails to immediately terminate a plan."""
    pass