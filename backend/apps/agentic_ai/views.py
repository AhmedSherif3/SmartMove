# DRF Views (Gatekeeping, Auth, HTTP requests)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics
from apps.agentic_ai.models import AgentSession, AgentMessage
from apps.analytics_pro_engine.models import AnalysisWorkspace
import json
from apps.agentic_ai.utils.token_tracker import ComputeGatekeeper
from apps.agentic_ai.exceptions import TokenLimitExceededError
from .serializers import InitializeSessionSerializer, AgentSessionHistorySerializer

class InitializeSwarmSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Validate the frontend JSON
        serializer = InitializeSessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        workspace_id = serializer.validated_data.get('workspace_id')

        # 2. Billing Check: Does the user have enough API compute credits?
        try:
            ComputeGatekeeper.check_allowance(request.user)
        except TokenLimitExceededError as e:
            return Response({"error": str(e)}, status=status.HTTP_402_PAYMENT_REQUIRED)

        # 3. Link to MinIO Workspace (If they are analyzing specific data)
        workspace = None
        if workspace_id:
            try:
                workspace = AnalysisWorkspace.objects.get(id=workspace_id, user=request.user)
            except AnalysisWorkspace.DoesNotExist:
                return Response(
                    {"error": "Workspace not found or access denied."}, 
                    status=status.HTTP_404_NOT_FOUND
                )

        # 4. Create the Database Session
        session = AgentSession.objects.create(
            user=request.user,
            workspace=workspace,
            title="New Analytical Session"
        )

        # 5. Hand Next.js the keys to the WebSocket room
        return Response({
            "status": "success",
            "session_id": str(session.id),
            "websocket_url": f"ws/agent/chat/{session.id}/"
        }, status=status.HTTP_201_CREATED)

class AgentSessionHistoryView(generics.ListAPIView):
    serializer_class = AgentSessionHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AgentSession.objects.filter(user=self.request.user).order_by('-created_at')

class AgentSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            session = AgentSession.objects.get(id=pk, user=request.user)
        except AgentSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
            
        last_message = session.messages.filter(role=AgentMessage.RoleChoices.ASSISTANT).order_by('-created_at').first()
        if not last_message:
             return Response({"ui_contract": None})
             
        try:
            ui_contract = json.loads(last_message.content)
            return Response({"ui_contract": ui_contract})
        except json.JSONDecodeError:
            return Response({"error": "Invalid content"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AgentSessionDownloadPdfView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            session = AgentSession.objects.get(id=pk, user=request.user)
        except AgentSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
            
        last_message = session.messages.filter(role=AgentMessage.RoleChoices.ASSISTANT).order_by('-created_at').first()
        if not last_message or not last_message.content:
            return Response({"error": "No report data found to generate PDF"}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            ui_contract = json.loads(last_message.content)
        except json.JSONDecodeError:
            return Response({"error": "Invalid report content"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            from django.http import FileResponse
            from apps.agentic_ai.tools.report_exporter import ReportExporterTool
            from io import BytesIO
            
            pdf_bytes = ReportExporterTool.generate_pdf_report(ui_contract)
            
            return FileResponse(
                BytesIO(pdf_bytes),
                content_type='application/pdf',
                filename=f"AI_Report_{session.id.hex[:8]}.pdf"
            )
        except Exception as e:
            return Response({"error": f"Failed to generate PDF: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)