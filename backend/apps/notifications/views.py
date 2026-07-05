from rest_framework import generics, status, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.users.permissions import IsSmartMoveAdmin
from apps.notifications.models import Notification
from apps.notifications.serializers import (
    NotificationSerializer, AdminBroadcastSerializer,
)
from apps.notifications.services import (
    mark_as_read, mark_all_as_read, get_unread_count, broadcast_to_users,
)


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Returns paginated notifications for the authenticated user.
    Supports query params:
      ?search=query
      ?ordering=-created_at | created_at | is_read | priority
      ?is_read=false     — filter unread only
      ?type=ai           — filter by type
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = NotificationPagination
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'is_read', 'priority']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == 'true')
        notif_type = self.request.query_params.get('type')
        if notif_type:
            qs = qs.filter(type=notif_type)
        return qs


class NotificationUnreadCountView(APIView):
    """
    GET /api/notifications/unread-count/
    Returns { "unread_count": 5 }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'unread_count': get_unread_count(request.user)})


class NotificationMarkReadView(APIView):
    """
    PATCH /api/notifications/<uuid:pk>/read/
    Marks a single notification as read.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        success = mark_as_read(pk, request.user)
        if not success:
            return Response(
                {'error': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'status': 'ok'})


class NotificationMarkAllReadView(APIView):
    """
    POST /api/notifications/mark-all-read/
    Marks all of the user's unread notifications as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = mark_all_as_read(request.user)
        return Response({'marked': count})


class NotificationDeleteView(APIView):
    """
    DELETE /api/notifications/<uuid:pk>/
    Deletes a single notification.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        deleted, _ = Notification.objects.filter(
            id=pk, user=request.user,
        ).delete()
        if not deleted:
            return Response(
                {'error': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBroadcastView(APIView):
    """
    POST /api/notifications/broadcast/
    Admin-only. Sends a custom notification to targeted users.
    """
    permission_classes = [IsSmartMoveAdmin]

    def post(self, request):
        serializer = AdminBroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            count = broadcast_to_users(
                sender=request.user,
                title=d['title'],
                message=d['message'],
                priority=d.get('priority', 'info'),
                link=d.get('link', ''),
                target_role=d.get('target_role') or None,
                target_region=d.get('target_region') or None,
            )
            return Response({'sent_to': count}, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
