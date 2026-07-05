"""
SmartMove Reports — URL Configuration

Routes:
    GET  /api/reports/           → ReportListView  (paywall-gated list)
    POST /api/reports/build-pdf/ → BuildPdfView     (Airflow M2M webhook)
"""

from django.urls import path

from .views import BuildPdfView, ReportListView, UploadAzureView, DispatchEmailView, PipelineStatusUpdateView, ReportPreviewView

urlpatterns = [
    path('', ReportListView.as_view(), name='report-list'),
    path('build-pdf/', BuildPdfView.as_view(), name='build-pdf'),
    path('<int:report_id>/upload-azure/', UploadAzureView.as_view(), name='upload-azure'),
    path('<int:report_id>/preview/', ReportPreviewView.as_view(), name='report-preview'),
    path('dispatch/', DispatchEmailView.as_view(), name='dispatch-email'),
    path('status/update/', PipelineStatusUpdateView.as_view(), name='status-update'),
]