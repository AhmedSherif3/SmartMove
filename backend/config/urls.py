from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # --- Core & Admin ---
    path('admin/', admin.site.urls),

    # --- Feature Apps ---
    path('api/auth/',           include('apps.authentication.urls')),
    path('api/users/',          include('apps.users.urls')),
    path('api/dashboard/',      include('apps.dashboard.urls')),
    path('api/upload/',         include('apps.upload.urls')),
    path('api/reports/',        include('apps.reports.urls')),
    path('api/predictions/',    include('apps.predictions.urls')),
    path('api/chatbot/',        include('apps.chatbot.urls')),
    path('api/monitoring/',     include('apps.monitoring.urls')),
    path('api/notifications/',  include('apps.notifications.urls')),
    path('api/integrations/',   include('apps.integrations.urls')),
    path('api/currency/',       include('apps.currency.urls')),
    path('api/cloud/',          include('apps.smartmove_cloud.urls')),
    path('api/engine/',         include('apps.analytics_pro_engine.urls')),
    path('api/subscriptions/',  include('apps.subscriptions.urls')),
    path('api/agentic/',        include('apps.agentic_ai.urls')),

    # --- API Documentation (Swagger/Redoc) ---
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/',   SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/',  SpectacularRedocView.as_view(url_name='schema'),   name='redoc'),

    # --- Monitoring (Prometheus) ---
    path('metrics/', include('django_prometheus.urls')),
]