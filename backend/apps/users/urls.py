from django.urls import path
from .views import (
    CurrentUserView,
    UserListView,
    UserDetailUpdateView,
    UploadProfilePhotoView,
    RequestEmailChangeView,
    VerifyEmailChangeView,
    UserSessionsView,
)


urlpatterns = [
    # Personal Profile Operations
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('me/photo/', UploadProfilePhotoView.as_view(), name='upload-profile-photo'),
    path('me/change-email/', RequestEmailChangeView.as_view(), name='request-email-change'),
    path('me/verify-email-change/', VerifyEmailChangeView.as_view(), name='verify-email-change'),
    path('me/sessions/', UserSessionsView.as_view(), name='user-sessions'),

    # Admin Management Operations
    path('list/', UserListView.as_view(), name='user-list'),
    path('<int:pk>/', UserDetailUpdateView.as_view(), name='user-detail-update'),
]