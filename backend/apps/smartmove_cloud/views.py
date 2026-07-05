import uuid
import boto3  # type: ignore
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics
from django.shortcuts import get_object_or_404
from apps.smartmove_cloud.models import UserFolder, UserFile, get_storage_quota, get_used_storage
from apps.smartmove_cloud.serializers import UserFolderSerializer, UserFileSerializer

from django.core.files.storage import default_storage

class DirectUploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        file_obj = request.FILES.get('file')
        filename = request.data.get('filename')
        file_size_bytes = int(request.data.get('file_size_bytes', 0))
        folder_id = request.data.get('folder_id')
        
        if not file_obj or not filename:
            return Response({"error": "File and filename are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        used_storage = get_used_storage(request.user)
        quota = get_storage_quota(request.user)
        
        if used_storage + file_size_bytes > quota:
            return Response({"error": "Storage quota exceeded"}, status=status.HTTP_403_FORBIDDEN)
            
        # Determine Folder
        folder = None
        if folder_id and folder_id not in ('root', 'null', ''):
            try:
                import uuid as uuid_mod
                uuid_mod.UUID(str(folder_id))  # Validate it's a real UUID
                folder = UserFolder.objects.get(id=folder_id, user=request.user)
            except (UserFolder.DoesNotExist, ValueError):
                pass
                
        file_id = uuid.uuid4()
        object_key = f"active/user_{request.user.id}/{file_id}_{filename}"
        
        # Save UserFile
        extension = filename.split('.')[-1] if '.' in filename else ''
        new_file = UserFile.objects.create(
            user=request.user,
            filename=filename,
            folder=folder,
            extension=extension,
            file_size_bytes=file_size_bytes,
            file_content=file_obj
        )
        
        return Response({"message": "File uploaded successfully", "file_id": new_file.id})

class StorageQuotaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        used_storage = get_used_storage(request.user)
        quota = get_storage_quota(request.user)
        percentage = (used_storage / quota) * 100 if quota > 0 else 0
        
        return Response({
            "bytes_used": used_storage,
            "bytes_total": quota,
            "percentage_used": round(percentage, 2)
        })

class WorkspaceContentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, folder_id=None):
        if folder_id:
            folder = get_object_or_404(UserFolder, id=folder_id, user=request.user)
            subfolders = UserFolder.objects.filter(parent=folder, user=request.user)
            files = UserFile.objects.filter(folder=folder, user=request.user)
            
            # Generate breadcrumbs
            breadcrumbs = []
            curr = folder
            while curr:
                breadcrumbs.insert(0, {"id": str(curr.id), "name": curr.name})
                curr = curr.parent
        else:
            # Root workspace
            subfolders = UserFolder.objects.filter(parent__isnull=True, user=request.user)
            files = UserFile.objects.filter(folder__isnull=True, user=request.user)
            breadcrumbs = []

        return Response({
            "breadcrumbs": breadcrumbs,
            "folders": UserFolderSerializer(subfolders, many=True).data,
            "files": UserFileSerializer(files, many=True).data,
        })

class UserFolderListCreateView(generics.ListCreateAPIView):
    serializer_class = UserFolderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserFolder.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class UserFolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserFolderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserFolder.objects.filter(user=self.request.user)

class UserFileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserFileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserFile.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        if instance.file_content:
            instance.file_content.delete(save=False)
        instance.delete()

class UserFileDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        file_obj = get_object_or_404(UserFile, id=pk, user=request.user)
        if not file_obj.file_content:
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            url = file_obj.file_content.url
            return Response({"download_url": url})
        except Exception:
            return Response({"error": "Could not generate download link"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserFileListAPIView(generics.ListAPIView):
    serializer_class = UserFileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserFile.objects.filter(user=self.request.user).order_by('-created_at')

