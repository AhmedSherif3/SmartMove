from datetime import timedelta

from django.db import models
from django.conf import settings
from django.utils import timezone


class UserIntegration(models.Model):
    PROVIDER_CHOICES = [
        ('google_drive', 'Google Drive'),
        ('onedrive', 'Microsoft OneDrive'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='integrations'
    )
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES)
    
    # Tokens can be massive, use TextField
    access_token = models.TextField()
    refresh_token = models.TextField(null=True, blank=True)
    scopes = models.CharField(max_length=255, blank=True, default='')
    
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'provider')
        verbose_name = "User Integration"
        verbose_name_plural = "User Integrations"

    def is_expired(self):
        """Check if the access token has expired (with 5-minute safety buffer)."""
        if not self.expires_at:
            return True
        return timezone.now() >= self.expires_at - timedelta(minutes=5)

    def __str__(self):
        return f"{self.user.email} - {self.provider}"