"""
Chatbot HTTP Views
==================
REST endpoints that complement the WebSocket interface.
"""

import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ConversationAuditLog, UserQuota

logger = logging.getLogger(__name__)


class QuotaStatusView(APIView):
    """
    GET /api/chatbot/quota/

    Returns the authenticated user's remaining daily query quota.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        quota = UserQuota.get_or_create_for_user(request.user)
        quota.reset_if_new_day()
        return Response(
            {
                'queries_used_today': quota.queries_used_today,
                'max_queries_per_day': quota.max_queries_per_day,
                'remaining': max(
                    0, quota.max_queries_per_day - quota.queries_used_today
                ),
                'last_reset': quota.last_reset.isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class ConversationHistoryView(APIView):
    """
    GET /api/chatbot/history/?limit=20&offset=0

    Returns paginated audit logs for the authenticated user.
    Used by the frontend to display past conversations.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(int(request.query_params.get('limit', 20)), 100)
        offset = int(request.query_params.get('offset', 0))

        logs = (
            ConversationAuditLog.objects.filter(user=request.user)
            .order_by('-created_at')[offset : offset + limit]
        )

        data = [
            {
                'id': log.id,
                'session_id': log.session_id,
                'prompt': log.prompt,
                'response': log.response,
                'model_used': log.model_used,
                'total_tokens': log.total_tokens,
                'response_time_ms': log.response_time_ms,
                'tools_invoked': log.tools_invoked,
                'cache_hit': log.cache_hit,
                'created_at': log.created_at.isoformat(),
            }
            for log in logs
        ]

        total = ConversationAuditLog.objects.filter(user=request.user).count()

        return Response(
            {
                'count': total,
                'limit': limit,
                'offset': offset,
                'results': data,
            },
            status=status.HTTP_200_OK,
        )


class ChatbotHealthView(APIView):
    """
    GET /api/chatbot/health/

    Lightweight health probe for load-balancer readiness checks.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {'status': 'healthy', 'service': 'chatbot'},
            status=status.HTTP_200_OK,
        )
