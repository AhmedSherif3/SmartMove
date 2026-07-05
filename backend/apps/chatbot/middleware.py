"""
CookieJWTMiddleware — Channels WebSocket Authentication
========================================================
Intercepts the WebSocket ``scope``, parses the ``Cookie`` header to extract
the ``access_token`` HttpOnly cookie, validates the JWT, and attaches the
authenticated user to ``scope['user']``.

This removes the need for the frontend to read the HttpOnly cookie and pass
it as a ``?token=`` query parameter — which is impossible by design (the
browser blocks JavaScript access to HttpOnly cookies).

Usage in ``routing.py``::

    from apps.chatbot.middleware import CookieJWTAuthMiddleware

    websocket_urlpatterns = [...]

    # Wrap URL patterns in the middleware
    application = CookieJWTAuthMiddleware(URLRouter(websocket_urlpatterns))
"""

import logging
from http.cookies import SimpleCookie
from typing import Any

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.users.models import User

logger = logging.getLogger(__name__)

# Cookie name — must match SIMPLE_JWT['AUTH_COOKIE'] in settings.
# Use getattr to avoid Pyright "no attribute .get" on the lazy settings object.
_jwt_settings: dict[str, Any] = getattr(settings, 'SIMPLE_JWT', {})
COOKIE_NAME: str = _jwt_settings.get('AUTH_COOKIE', 'access_token')


class CookieJWTAuthMiddleware(BaseMiddleware):
    """
    Custom Channels middleware that authenticates WebSocket connections
    using the ``access_token`` HttpOnly cookie set by the login endpoint.

    The browser automatically includes cookies on the WebSocket upgrade
    request (same-origin or ``SameSite=None; Secure`` cross-origin), so
    the frontend needs zero changes.

    Fallback: if no valid cookie is found, ``scope['user']`` is set to
    ``AnonymousUser`` and the consumer's ``connect()`` method can decide
    whether to accept or reject the connection.
    """

    async def __call__(self, scope: Any, receive: Any, send: Any):
        # Only process WebSocket connections
        if scope['type'] != 'websocket':
            return await super().__call__(scope, receive, send)

        # ── Extract cookies from the raw HTTP headers ─────────────────
        headers: list[tuple[bytes, bytes]] = scope.get('headers', [])
        cookie_header = ''
        for name, value in headers:
            if name == b'cookie':
                cookie_header = value.decode('utf-8', errors='replace')
                break

        # ── Parse the cookie string and find the access_token ─────────
        user = AnonymousUser()

        if cookie_header:
            parsed = SimpleCookie(cookie_header)
            morsel = parsed.get(COOKIE_NAME)
            if morsel:
                raw_token = morsel.value
                user = await self._authenticate_jwt(raw_token)

        scope['user'] = user

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _authenticate_jwt(self, raw_token: str):
        """
        Validate a JWT access token string and return the User instance.
        Returns ``AnonymousUser`` on any failure.
        """
        try:
            access = AccessToken(raw_token)  # type: ignore[arg-type]
            user_id = access.get('user_id')
            if user_id is None:
                logger.debug('JWT cookie missing user_id claim')
                return AnonymousUser()
            return User.objects.get(pk=user_id)
        except (TokenError, User.DoesNotExist) as exc:  # type: ignore[attr-defined]
            logger.debug('Cookie JWT validation failed: %s', exc)
            return AnonymousUser()
