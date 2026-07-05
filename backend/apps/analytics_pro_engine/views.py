# pyrefly: ignore [missing-source-for-stubs]
import pandas as pd
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
import uuid
import json
import io
from io import BytesIO
from django.http import FileResponse
from apps.agentic_ai.tools.report_exporter import ReportExporterTool

from apps.smartmove_cloud.models import UserFile
from .models import AnalysisWorkspace
from .tasks import generate_ai_dashboard


class QuickProfilerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, file_id):
        try:
            file_obj = UserFile.objects.get(id=file_id, user=request.user)
        except UserFile.DoesNotExist:  # type: ignore
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            if not file_obj.file_content:
                return Response({"error": "File has no content stored"}, status=status.HTTP_404_NOT_FOUND)
            
            file_bytes = file_obj.file_content.read()
            filename = getattr(file_obj, 'filename', '').lower()
            
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_bytes), nrows=100)
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(io.BytesIO(file_bytes), nrows=100)
            else:
                return Response({"error": f"Unsupported file format: {filename}"}, status=status.HTTP_400_BAD_REQUEST)
            
            row_count = len(df)
            column_names = df.columns.tolist()
            missing_values = df.isnull().sum().to_dict()
            missing_values_detected = any(val > 0 for val in missing_values.values())
            
            return Response({
                "row_count": row_count,
                "column_names": column_names,
                "missing_values_detected": missing_values_detected
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AnalyzeWorkspaceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_ids = request.data.get('file_ids', [])
        if not file_ids:
            return Response({"error": "No files provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create workspace
        workspace = AnalysisWorkspace.objects.create(
            user=request.user,
            name=f"Workspace - {uuid.uuid4().hex[:8]}"
        )
        
        # Add files
        files = UserFile.objects.filter(id__in=file_ids, user=request.user)
        workspace.files.set(files)
        
        # Run in background thread (no Celery needed)
        from .tasks import _run_in_background
        _run_in_background(str(workspace.id))
        
        return Response({
            "workspace_id": str(workspace.id),
            "message": "Analysis started"
        })

class AnalyzeStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        try:
            workspace = AnalysisWorkspace.objects.get(id=workspace_id, user=request.user)
        except AnalysisWorkspace.DoesNotExist:
            return Response({"error": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check dashboard_payload (new Postgres-based storage)
        if workspace.dashboard_payload and isinstance(workspace.dashboard_payload, dict) and workspace.dashboard_payload != {}:
            return Response({
                "status": "completed",
                "dashboard_data": workspace.dashboard_payload
            })
        
        # Check for failure via legacy field
        if getattr(workspace, 'minio_dashboard_key', None) == "FAILED":
            return Response({"status": "failed", "error": "Analysis failed during processing"})
        
        return Response({"status": "processing"})

class ListAnalysisWorkspaceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        workspaces = AnalysisWorkspace.objects.filter(user=request.user).order_by('-created_at')
        
        data = []
        for ws in workspaces:
            file_names = [f.filename for f in ws.files.all()]
            
            # Determine status from dashboard_payload first, then legacy minio_dashboard_key
            if ws.dashboard_payload and isinstance(ws.dashboard_payload, dict) and ws.dashboard_payload != {}:
                status_val = "completed"
            elif getattr(ws, 'minio_dashboard_key', None) == "FAILED":
                status_val = "failed"
            elif getattr(ws, 'minio_dashboard_key', None):
                status_val = "completed"
            else:
                status_val = "processing"
                
            data.append({
                "id": str(ws.id),
                "name": ws.name,
                "created_at": ws.created_at.isoformat(),
                "status": status_val,
                "files": file_names
            })
            
        return Response(data)

    def delete(self, request, workspace_id=None):
        if not workspace_id:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        try:
            if workspace_id == 'all':
                AnalysisWorkspace.objects.filter(user=request.user).delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            else:
                ws = AnalysisWorkspace.objects.get(id=workspace_id, user=request.user)
                ws.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
        except AnalysisWorkspace.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

class AnalyzeWorkspaceDownloadPdfView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id):
        try:
            workspace = AnalysisWorkspace.objects.get(id=workspace_id, user=request.user)
        except AnalysisWorkspace.DoesNotExist:
            return Response({"error": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        
        dashboard_json = workspace.dashboard_payload
        if not dashboard_json or not isinstance(dashboard_json, dict) or dashboard_json == {}:
            return Response({"error": "No valid dashboard found for PDF generation"}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            pdf_bytes = ReportExporterTool.generate_pdf_report(dashboard_json)
            
            return FileResponse(
                BytesIO(pdf_bytes),
                content_type='application/pdf',
                filename=f"Analytics_Report_{workspace.id.hex[:8]}.pdf"
            )
        except Exception as e:
            return Response({"error": f"Failed to generate PDF: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
