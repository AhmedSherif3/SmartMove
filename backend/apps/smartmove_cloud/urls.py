from django.urls import path
from .views import (
    DirectUploadView, StorageQuotaView,
    WorkspaceContentView, UserFolderListCreateView, UserFolderDetailView,
    UserFileDetailView, UserFileDownloadView, UserFileListAPIView
)

urlpatterns = [
    path('upload/', DirectUploadView.as_view(), name='direct-upload'),
    path('quota/', StorageQuotaView.as_view(), name='storage-quota'),
    
    # Workspace & Folders
    path('workspace/', WorkspaceContentView.as_view(), name='workspace-root'),
    path('workspace/<uuid:folder_id>/', WorkspaceContentView.as_view(), name='workspace-folder'),
    path('folders/', UserFolderListCreateView.as_view(), name='folder-list-create'),
    path('folders/<uuid:pk>/', UserFolderDetailView.as_view(), name='folder-detail'),
    
    # Files
    path('files/', UserFileListAPIView.as_view(), name='file-list'),
    path('files/<uuid:pk>/', UserFileDetailView.as_view(), name='file-detail'),
    path('files/<uuid:pk>/download/', UserFileDownloadView.as_view(), name='file-download'),
]
