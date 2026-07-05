from django.urls import path
from .views import QuickProfilerView, AnalyzeWorkspaceView, AnalyzeStatusView, ListAnalysisWorkspaceView, AnalyzeWorkspaceDownloadPdfView

urlpatterns = [
    path('quick-profile/<uuid:file_id>/', QuickProfilerView.as_view(), name='quick-profile'),
    path('analyze/', AnalyzeWorkspaceView.as_view(), name='analyze-workspace'),
    path('analyze/status/<uuid:workspace_id>/', AnalyzeStatusView.as_view(), name='analyze-status'),
    path('analyze/runs/', ListAnalysisWorkspaceView.as_view(), name='analyze-runs'),
    path('analyze/runs/all/', ListAnalysisWorkspaceView.as_view(), name='analyze-runs-delete-all'),
    path('analyze/runs/<uuid:workspace_id>/', ListAnalysisWorkspaceView.as_view(), name='analyze-runs-delete'),
    path('analyze/runs/<uuid:workspace_id>/download-pdf/', AnalyzeWorkspaceDownloadPdfView.as_view(), name='analyze-download-pdf'),
]
