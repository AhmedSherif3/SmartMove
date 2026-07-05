"""
Custom exceptions for the Agentic AI ecosystem.
Ensures graceful error handling and clear error paths for the Next.js UI.
"""

class AgenticBaseException(Exception):
    """Base exception for all AI-related errors to ensure graceful Next.js degradation."""
    pass

class TokenLimitExceededError(AgenticBaseException):
    """Raised when a free user tries to consume more GPT-4o compute than their Subscription allows."""
    def __init__(self, message="Compute limit exceeded. Please upgrade to the Data Analyst tier."):
        self.message = message
        super().__init__(self.message)

class AzureSandboxError(AgenticBaseException):
    """Raised when the AI attempts an invalid SQL query or the read-only Azure connection fails."""
    pass

class LLMHallucinationError(AgenticBaseException):
    """Raised by the Serializer if the UI Designer Agent outputs invalid JSON."""
    pass

class CurrencyConversionError(AgenticBaseException):
    """Raised if the agent requests a currency pair that your currency app doesn't support."""
    pass