from django.apps import AppConfig  # type: ignore[import-untyped]


class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'  # type: ignore[assignment]
    name = 'apps.chatbot'
    label = 'chatbot'
    verbose_name = 'Conversational AI Chatbot'

    def ready(self):
        """Import signal handlers when the app is loaded."""
        pass