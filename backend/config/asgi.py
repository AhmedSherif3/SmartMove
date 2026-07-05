"""
ASGI config for SmartMove project.

Exposes the ASGI callable as a module-level variable named ``application``.
Integrates Django Channels for WebSocket support with cookie-based JWT
authentication via ``CookieJWTAuthMiddleware``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application  # type: ignore[import-untyped]

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialise Django ASGI application early to populate the AppRegistry
django_asgi_app = get_asgi_application()

# Import after Django setup to avoid AppRegistryNotReady
from apps.chatbot.middleware import CookieJWTAuthMiddleware  # noqa: E402
from apps.chatbot.routing import websocket_urlpatterns as chatbot_urls  # noqa: E402
from apps.agentic_ai.routing import websocket_urlpatterns as agentic_urls # noqa: E402
from apps.notifications.routing import websocket_urlpatterns as notification_urls # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': CookieJWTAuthMiddleware(
        URLRouter(chatbot_urls + agentic_urls + notification_urls)  # type: ignore[arg-type]
    ),
})
