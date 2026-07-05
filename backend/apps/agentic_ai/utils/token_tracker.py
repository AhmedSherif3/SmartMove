# Calculates billing costs
from django.db.models import Sum
from apps.agentic_ai.models import TokenUsageLog
from apps.agentic_ai.exceptions import TokenLimitExceededError
from apps.subscriptions.models import CustomerProfile

class ComputeGatekeeper:
    """
    Manages API usage allowances and logs OpenAI/Gemini token costs.
    """
    
    # Monthly token limits based on user roles
    FREE_TIER_LIMIT = 50_000        # Enough for basic Gemini UI formatting
    PREMIUM_TIER_LIMIT = 2_000_000  # High limit for GPT-4o data analysts

    @classmethod
    def check_allowance(cls, user) -> bool:
        """
        Verifies if the user has enough compute credits remaining for this month.
        Raises TokenLimitExceededError if they are maxed out.
        """
        # Get the current usage for the month
        usage = TokenUsageLog.objects.filter(user=user).aggregate(
            total=Sum('total_tokens')
        )['total'] or 0

        # Determine the user's tier from the Stripe profile
        try:
            profile = user.stripe_profile
            limit = cls.PREMIUM_TIER_LIMIT if profile.role == 'data_analyst' else cls.FREE_TIER_LIMIT
        except CustomerProfile.DoesNotExist:
            # Fallback for users without a billing profile yet
            limit = cls.FREE_TIER_LIMIT

        if usage >= limit:
            raise TokenLimitExceededError(
                f"You have consumed {usage:,} tokens. Your plan limit is {limit:,}. "
                "Please upgrade to the Data Analyst tier for extended AI compute."
            )
            
        return True

    @classmethod
    def log_usage(cls, user, session, model_name: str, prompt_tokens: int, completion_tokens: int):
        """
        Records the exact token transaction to the database ledger.
        """
        TokenUsageLog.objects.create(
            user=user,
            session=session,
            model_used=model_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens
        )