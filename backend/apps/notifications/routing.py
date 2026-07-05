from django.urls import re_path
from .consumers import NotificationConsumer

websocket_urlpatterns = [
    # pyrefly: ignore [no-matching-overload]
    re_path(r'^ws/notifications/$', NotificationConsumer.as_asgi()),
]
