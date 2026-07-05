"""
HTTP API Routes for the Chatbot App
====================================
Provides REST endpoints for quota status, conversation history,
and health checks. The core chat interface uses WebSockets (see routing.py).
"""

from django.urls import path  # type: ignore[import-untyped]

from . import views
from . import views_chat

app_name = 'chatbot'

urlpatterns = [
    # ── Pusher Auth ───────────────────────────────────────────────────────
    path(
        'pusher/auth/',
        views_chat.pusher_auth,
        name='pusher-auth',
    ),

    # ── Chat Message ──────────────────────────────────────────────────────
    path(
        'message/',
        views_chat.chat_message,
        name='chat-message',
    ),

    # ── Quota Management ──────────────────────────────────────────────────
    path(
        'quota/',
        views.QuotaStatusView.as_view(),
        name='quota-status',
    ),

    # ── Conversation History ──────────────────────────────────────────────
    path(
        'history/',
        views.ConversationHistoryView.as_view(),
        name='conversation-history',
    ),

    # ── Health Check (unauthenticated, for load-balancer probes) ──────────
    path(
        'health/',
        views.ChatbotHealthView.as_view(),
        name='chatbot-health',
    ),
]