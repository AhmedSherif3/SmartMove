from django.urls import path
from .views import (
    GenerateSASTokenView, 
    RegisterUploadView, 
    ImportListView, 
    WebhookView
)

urlpatterns = [
    # Upload Flow
    path('sas-token/', GenerateSASTokenView.as_view(), name='sas-token'),
    path('register/', RegisterUploadView.as_view(), name='register-upload'),
    
    # Dashboard & Control
    path('list/', ImportListView.as_view(), name='import-list'),
    
    # Airflow Webhook
    path('webhook/airflow/', WebhookView.as_view(), name='airflow-webhook'),
]