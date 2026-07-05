from django.apps import AppConfig

class SmartmoveCloudConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.smartmove_cloud'

    def ready(self):
        import apps.smartmove_cloud.signals
