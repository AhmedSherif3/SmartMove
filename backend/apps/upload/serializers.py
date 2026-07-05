from rest_framework import serializers
from .models import DataImport

class DataImportSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.CharField(source='uploaded_by.email', read_only=True)

    class Meta:
        model = DataImport
        fields = [
            'id', 'file_name', 'region', 'source', 'status', 
            'total_rows', 'processed_rows', 'error_message', 
            'uploaded_by_email', 'created_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'status', 'total_rows', 'processed_rows', 
            'error_message', 'uploaded_by_email', 'created_at', 'completed_at'
        ]

class SASTokenRequestSerializer(serializers.Serializer):
    """Next.js sends the filename and region to get the direct-to-cloud upload link."""
    filename = serializers.CharField(max_length=255, required=False)
    file_name = serializers.CharField(max_length=255, required=False)
    region = serializers.ChoiceField(choices=DataImport.Region.choices)
    file_size_bytes = serializers.IntegerField(required=False, default=0)

    def validate(self, attrs):
        filename = attrs.get('filename') or attrs.get('file_name')
        if not filename:
            raise serializers.ValidationError({'filename': 'This field is required.'})
        attrs['filename'] = filename
        attrs.pop('file_name', None)
        return attrs