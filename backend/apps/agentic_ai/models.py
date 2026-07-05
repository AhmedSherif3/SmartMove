"""
Database models for tracking Agentic AI chat sessions, historical messaging,
and micro-token accounting across cloud providers.
"""
import uuid
from django.db import models
from django.conf import settings
from apps.smartmove_cloud.models import UserFolder

class AgentSession(models.Model):
    """
    Groups a single continuous conversation thread between the user and the Multi-Agent Swarm.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='agent_sessions')
    workspace = models.ForeignKey(UserFolder, on_delete=models.SET_NULL, null=True, blank=True, help_text="The MinIO workspace this session is actively analyzing.")
    title = models.CharField(max_length=255, blank=True, help_text="Auto-generated title based on the first prompt.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session {self.id} - {self.user.email}"

class AgentMessage(models.Model):
    """
    Stores the actual prompt history for the Context Window Summarizer.
    """
    class RoleChoices(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'
        SYSTEM = 'system', 'System'

    session = models.ForeignKey(AgentSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=RoleChoices.choices)
    content = models.TextField()
    token_count = models.IntegerField(default=0, help_text="Number of tokens consumed by this specific message.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.role.capitalize()} message in Session {self.session.id}"

class TokenUsageLog(models.Model):
    """
    The financial ledger. Tracks API compute costs to enforce limits based on the user's Subscriptions profile.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='token_logs')
    session = models.ForeignKey(AgentSession, on_delete=models.SET_NULL, null=True, blank=True)
    model_used = models.CharField(max_length=50, help_text="e.g., 'azure/gpt-4o', 'google/gemini-3.5-flash'")
    prompt_tokens = models.IntegerField()
    completion_tokens = models.IntegerField()
    total_tokens = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.total_tokens = self.prompt_tokens + self.completion_tokens
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Tokens for {self.user.email} - {self.model_used} ({self.total_tokens} total)"