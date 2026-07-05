from django.contrib import admin
from .models import DataImport

@admin.register(DataImport)
class DataImportAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'region', 'source', 'status', 'processed_rows', 'uploaded_by', 'created_at')
    list_filter = ('status', 'region', 'source')
    search_fields = ('file_name',)
    readonly_fields = ('last_heartbeat', 'created_at', 'completed_at')