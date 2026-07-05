"""
Integrations Service Layer
--------------------------
Handles token refresh and validation for Google Drive and Microsoft OneDrive.
All views should call get_valid_token() instead of accessing tokens directly.
"""
import os
from datetime import timedelta

import requests
from django.utils import timezone
from .models import UserIntegration


class IntegrationNotFound(Exception):
    """Raised when no integration exists for the given user+provider."""
    pass


class TokenRefreshError(Exception):
    """Raised when a token refresh fails (e.g., user revoked access)."""
    pass


# --- Provider-specific refresh endpoints ---
REFRESH_CONFIGS = {
    'google_drive': {
        'token_url': 'https://oauth2.googleapis.com/token',
        'client_id_env': 'GOOGLE_CLIENT_ID',
        'client_secret_env': 'GOOGLE_CLIENT_SECRET',
    },
    'onedrive': {
        'token_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        'client_id_env': 'MICROSOFT_CLIENT_ID',
        'client_secret_env': 'MICROSOFT_CLIENT_SECRET',
    },
}


def refresh_token_if_expired(integration: UserIntegration) -> UserIntegration:
    """
    Checks if the access token is expired and silently refreshes it.
    Updates the database and returns the refreshed integration object.
    
    Raises:
        TokenRefreshError: If the refresh fails (user revoked access, etc.)
    """
    if not integration.is_expired():
        return integration

    if not integration.refresh_token:
        raise TokenRefreshError(
            f"Token expired for {integration.provider} and no refresh token is available. "
            "User must reconnect."
        )

    config = REFRESH_CONFIGS.get(integration.provider)
    if not config:
        raise TokenRefreshError(f"Unknown provider: {integration.provider}")

    # Send the refresh token to the provider's token endpoint
    response = requests.post(config['token_url'], data={
        'client_id': os.environ.get(config['client_id_env']),
        'client_secret': os.environ.get(config['client_secret_env']),
        'refresh_token': integration.refresh_token,
        'grant_type': 'refresh_token',
    })

    if response.status_code != 200:
        raise TokenRefreshError(
            f"Failed to refresh {integration.provider} token: "
            f"{response.status_code} - {response.text}"
        )

    token_data = response.json()

    # Update the integration with fresh tokens
    integration.access_token = token_data['access_token']
    
    # Some providers return a new refresh token — always update if present
    if 'refresh_token' in token_data:
        integration.refresh_token = token_data['refresh_token']

    # Calculate new expiry
    expires_in = token_data.get('expires_in', 3600)
    integration.expires_at = timezone.now() + timedelta(seconds=expires_in)
    
    integration.save(update_fields=['access_token', 'refresh_token', 'expires_at', 'updated_at'])
    
    return integration


def get_valid_token(user, provider: str) -> str:
    """
    The main entry point for all views. Fetches the user's integration,
    refreshes if needed, and returns a valid access token string.
    
    Raises:
        IntegrationNotFound: If no connection exists for this user+provider
        TokenRefreshError: If the token refresh fails
    """
    try:
        integration = UserIntegration.objects.get(user=user, provider=provider)
    except UserIntegration.DoesNotExist:
        raise IntegrationNotFound(
            f"No {provider} connection found. Please connect your account first."
        )

    integration = refresh_token_if_expired(integration)
    return integration.access_token
