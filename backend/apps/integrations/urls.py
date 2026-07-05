from django.urls import path
from .views import (
    ConnectGoogleDriveView,
    ConnectMicrosoftView,
    ListCloudFilesView,
    PreviewCloudFileView,
    TransferCloudFileView,
    ListConnectionsView,
    DisconnectIntegrationView,
)

urlpatterns = [
    # OAuth Connection
    path('google/connect/', ConnectGoogleDriveView.as_view(), name='google-connect'),
    path('microsoft/connect/', ConnectMicrosoftView.as_view(), name='microsoft-connect'),
    
    # Cloud File Operations
    path('<str:provider>/files/', ListCloudFilesView.as_view(), name='cloud-files'),
    path('drive/preview/', PreviewCloudFileView.as_view(), name='cloud-preview'),
    path('drive/transfer/', TransferCloudFileView.as_view(), name='cloud-transfer'),

    # Connection Management
    path('connections/', ListConnectionsView.as_view(), name='list-connections'),
    path('<str:provider>/disconnect/', DisconnectIntegrationView.as_view(), name='disconnect-integration'),
]