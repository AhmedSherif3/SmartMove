from django.db import models
from django.conf import settings
import uuid

class AnalysisWorkspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workspaces')
    name = models.CharField(max_length=255)
    files = models.ManyToManyField("smartmove_cloud.UserFile", related_name='workspaces', blank=True)
    dashboard_payload = models.JSONField(null=True, blank=True)
    minio_dashboard_key = models.CharField(max_length=1024, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()

    def __str__(self):
        return self.name
