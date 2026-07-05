from rest_framework import serializers
from .models import UserFolder, UserFile

class UserFolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFolder
        fields = ['id', 'name', 'parent', 'created_at']
        read_only_fields = ['id', 'created_at']

class UserFileSerializer(serializers.ModelSerializer):
    path = serializers.SerializerMethodField()

    class Meta:
        model = UserFile
        fields = ['id', 'filename', 'custom_name', 'extension', 'file_size_bytes', 'folder', 'created_at', 'path']
        read_only_fields = ['id', 'filename', 'extension', 'file_size_bytes', 'created_at', 'path']

    def get_path(self, obj):
        path_parts = []
        curr = obj.folder
        while curr:
            path_parts.insert(0, curr.name)
            curr = curr.parent
        return "/".join(path_parts) if path_parts else ""
