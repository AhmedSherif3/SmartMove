from django.db import models
from django.conf import settings
import uuid

class UserFolder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='folders')
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'parent', 'name')

    objects = models.Manager()

    def __str__(self):
        return f"{self.name} (User: {getattr(self.user, 'email', str(self.user))})"

class UserFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='files')
    folder = models.ForeignKey(UserFolder, on_delete=models.CASCADE, null=True, blank=True, related_name='files')
    filename = models.CharField(max_length=255)
    custom_name = models.CharField(max_length=255, null=True, blank=True)
    extension = models.CharField(max_length=10)
    file_size_bytes = models.BigIntegerField()
    file_content = models.FileField(upload_to='user_files/', null=True, blank=True)
    minio_object_key = models.CharField(max_length=1024, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()

    def __str__(self):
        return self.filename

def get_storage_quota(user):
    if hasattr(user, 'stripe_profile'):
        try:
            allowance_gb = user.stripe_profile.get_total_storage_allowance()
            return allowance_gb * 1024 * 1024 * 1024
        except Exception:
            pass
            
    # Fallback to simple logic if profile is missing or errors
    if hasattr(user, 'role') and user.role == 'DATA_ANALYST':
        return 5 * 1024 * 1024 * 1024
    return 1 * 1024 * 1024 * 1024

def get_used_storage(user):
    return sum(f.file_size_bytes for f in user.files.all())
