from django.contrib import admin
from .models import UserIntegration

@admin.register(UserIntegration)
class UserIntegrationAdmin(admin.ModelAdmin):
    list_display = ('user', 'provider', 'expires_at', 'created_at')
    list_filter = ('provider',)
    search_fields = ('user__email',)