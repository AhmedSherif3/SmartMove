# API routing (HTTP REST)
from django.urls import path
from . import views_run
from .views import InitializeSwarmSessionView, AgentSessionHistoryView, AgentSessionDetailView, AgentSessionDownloadPdfView

urlpatterns = [
    path('session/init/', InitializeSwarmSessionView.as_view(), name='init_swarm_session'),
    path('sessions/', AgentSessionHistoryView.as_view(), name='agent_session_history'),
    path('sessions/<uuid:pk>/download-pdf/', AgentSessionDownloadPdfView.as_view(), name='agent_session_download_pdf'),
    path('run/', views_run.run_agentic, name='run_agentic'),
]