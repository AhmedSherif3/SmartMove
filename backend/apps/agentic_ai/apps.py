# Django app config
from django.apps import AppConfig

class AgenticAiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.agentic_ai'
    verbose_name = 'SmartMove Agentic AI Engine'

    def ready(self):
        # This is where you would import any signal handlers in the future
        # e.g., importing a signal that triggers a Celery task when a session ends
        pass