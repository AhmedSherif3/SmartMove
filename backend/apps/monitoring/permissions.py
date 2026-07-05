"""
SmartMove SOC — Machine-to-Machine Authentication Permissions

Provides ``HasAlertmanagerSecret``, a DRF permission that validates an
``X-Alertmanager-Token`` header against a server-side secret.  This
replaces the previous ``AllowAny`` policy on the webhook receiver,
ensuring only authorised Alertmanager instances can trigger self-healing
runbooks.

Usage:
    # Alertmanager HTTP config:
    #   http_config:
    #     headers:
    #       X-Alertmanager-Token: "<shared secret>"
"""

import hmac
import logging

from django.conf import settings  # type: ignore[import-untyped]
from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

logger = logging.getLogger('apps.monitoring.permissions')


class HasAlertmanagerSecret(BasePermission):
    """
    Allow access only if the request carries a valid shared-secret token
    in the ``X-Alertmanager-Token`` HTTP header.

    The expected token is read from ``settings.ALERTMANAGER_SECRET_TOKEN``.
    If the setting is empty or missing, **all requests are denied** to
    prevent accidental open-access in production.

    Comparison uses ``hmac.compare_digest`` to mitigate timing-attack
    side-channels on the secret value.
    """

    HEADER_NAME = 'HTTP_X_ALERTMANAGER_TOKEN'

    def has_permission(self, request: Request, view: APIView) -> bool:
        expected_token: str = getattr(
            settings, 'ALERTMANAGER_SECRET_TOKEN', '',
        )

        # Fail-closed: if the setting is not configured, deny everything.
        if not expected_token:
            logger.error(
                'ALERTMANAGER_SECRET_TOKEN is not configured — '
                'all webhook requests will be denied.',
                extra={'event': 'alertmanager_auth_misconfigured'},
            )
            return False

        # Extract the token from the request header
        provided_token: str = request.META.get(self.HEADER_NAME, '')

        if not provided_token:
            logger.warning(
                'Alertmanager webhook rejected: missing X-Alertmanager-Token',
                extra={'event': 'alertmanager_auth_missing_token'},
            )
            return False

        # Constant-time comparison to prevent timing attacks
        is_valid = hmac.compare_digest(
            provided_token.encode('utf-8'),
            expected_token.encode('utf-8'),
        )

        if not is_valid:
            logger.warning(
                'Alertmanager webhook rejected: invalid token',
                extra={'event': 'alertmanager_auth_invalid_token'},
            )

        return is_valid
