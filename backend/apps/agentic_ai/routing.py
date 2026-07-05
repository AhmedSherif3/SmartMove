from django.urls import re_path
from .consumers import AgenticChatConsumer

websocket_urlpatterns = [
    # pyrefly: ignore [no-matching-overload]
    re_path(r'^ws/agentic/(?P<session_id>[\w-]+)/$', AgenticChatConsumer.as_asgi()),
]
