"""
WebSocket Routing
=================
Maps ``ws://host/ws/chatbot/`` to the ChatConsumer.

This module is imported by the ASGI application entry point
(``config/asgi.py``) and wrapped in ``CookieJWTAuthMiddleware``
so that the ``access_token`` HttpOnly cookie is parsed automatically.
"""

from django.urls import re_path

from .consumers import ChatConsumer

websocket_urlpatterns = [
    re_path(r'^ws/chatbot/$', ChatConsumer.as_asgi()),
]
