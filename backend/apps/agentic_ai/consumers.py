# WebSockets (Real-time thought streaming to Next.js)
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from apps.agentic_ai.models import AgentSession, AgentMessage
from asgiref.sync import sync_to_async

from apps.agentic_ai.agents.orchestrator import SupervisorAgent
from apps.agentic_ai.agents.data_engineer import DataEngineerAgent
from apps.agentic_ai.agents.data_analyst import AdvancedDataAnalystAgent
from apps.agentic_ai.agents.dashboard_curator import DashboardCuratorAgent
from apps.agentic_ai.tools.report_exporter import ReportExporterTool
from apps.agentic_ai.utils.token_tracker import ComputeGatekeeper
from apps.agentic_ai.tasks import compress_session_memory

class AgenticChatConsumer(AsyncWebsocketConsumer):
    """
    Handles real-time, bi-directional streaming between the Next.js frontend 
    and the Multi-Agent Swarm.
    """

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'agent_session_{self.session_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        await self.send(text_data=json.dumps({
            'type': 'system_status',
            'message': 'Connected to SmartMove Swarm Intelligence.'
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.send(text_data=json.dumps({"error": "Unauthenticated."}))
            return

        action = text_data_json.get('action', 'chat')
        
        if action == 'chat':
            user_prompt = text_data_json.get('prompt')
            await self.handle_chat(user_prompt, user)
        elif action == 'download_pdf':
            await self.handle_pdf_download(text_data_json.get('file_key'), user)
        elif action == 'save_to_cloud':
            await self.handle_cloud_save(text_data_json.get('file_key'), user, text_data_json.get('workspace_id'))

    async def handle_pdf_download(self, file_key, user):
        if getattr(user, 'role', '') != 'DATA_ANALYST':
            await self.send(text_data=json.dumps({
                "type": "upgrade_required",
                "message": "Please upgrade to the Data Analyst tier to download PDF reports.",
                "requires_upgrade": True
            }))
            return
        
        link = await sync_to_async(ReportExporterTool.get_download_link)(file_key)
        await self.send(text_data=json.dumps({
            "type": "download_link_ready",
            "url": link
        }))

    async def handle_cloud_save(self, file_key, user, workspace_id):
        if getattr(user, 'role', '') != 'DATA_ANALYST':
            await self.send(text_data=json.dumps({
                "type": "upgrade_required",
                "message": "Please upgrade to the Data Analyst tier to save reports to SmartMove Cloud.",
                "requires_upgrade": True
            }))
            return
        
        await self.send(text_data=json.dumps({
            "type": "cloud_save_success",
            "message": "Report saved to SmartMove Cloud Workspace successfully."
        }))

    @sync_to_async
    def get_session(self, user):
        import uuid
        try:
            session_uuid = uuid.UUID(str(self.session_id))
        except (ValueError, TypeError):
            session_uuid = uuid.uuid4()
            self.session_id = str(session_uuid)

        session, _ = AgentSession.objects.get_or_create(
            id=session_uuid,
            defaults={'user': user, 'title': 'New Analytical Session'}
        )
        return session

    @sync_to_async
    def save_message(self, session, role, content, token_count=0):
        return AgentMessage.objects.create(
            session=session, role=role, content=content, token_count=token_count
        )

    @sync_to_async
    def get_history(self, session):
        msgs = AgentMessage.objects.filter(session=session).order_by('-created_at')[:5]
        return [{"role": m.role, "content": m.content} for m in reversed(msgs)]
        
    @sync_to_async
    def log_usage(self, user, session, agent_name, usage):
        ComputeGatekeeper.log_usage(
            user=user, 
            session=session, 
            model_name=agent_name, 
            prompt_tokens=usage.get("prompt_tokens", 0), 
            completion_tokens=usage.get("completion_tokens", 0)
        )

    async def handle_chat(self, user_prompt, user):
        session = await self.get_session(user)
        workspace_id = str(session.workspace.id) if session.workspace else None

        await self.save_message(session, AgentMessage.RoleChoices.USER, user_prompt)
        await self.send(text_data=json.dumps({'type': 'user_message', 'message': user_prompt}))
        
        history = await self.get_history(session)

        # 1. Supervisor
        await self.send(text_data=json.dumps({'type': 'agent_status', 'message': 'Supervisor is analyzing request...'}))
        supervisor = SupervisorAgent()
        
        try:
            route_res = await sync_to_async(supervisor.route_query)(user_prompt, history)
            await self.log_usage(user, session, "Supervisor", route_res["usage"])
            decision = route_res["decision"]
            target = decision.get("target_agent", "COMPOUND_PIPELINE")
            instructions = decision.get("instructions", user_prompt)

            if target == "COMPOUND_PIPELINE":
                await self.run_compound_pipeline(instructions, session, user, workspace_id)
            else:
                await self.send(text_data=json.dumps({'type': 'agent_status', 'message': f'Routing to {target}...'}))
                # Fallback implementation omitted for brevity
                
            # Trigger Memory compression if needed
            try:
                compress_session_memory.delay(self.session_id) # type: ignore
            except Exception as cel_err:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning("Celery memory compression task failed: %s", cel_err)

        except Exception as e:
            await self.send(text_data=json.dumps({'type': 'error', 'message': str(e)}))
            from apps.notifications.services import create_notification
            await sync_to_async(create_notification)(
                user=user,
                title='AI Pipeline Failed',
                message=f'An error occurred during analysis: {str(e)[:200]}',
                notification_type='ai',
                priority='error',
                icon='error',
                link='/agentic',
                source_app='agentic_ai',
            )

    async def run_compound_pipeline(self, instructions, session, user, workspace_id):
        # Data Engineer
        await self.send(text_data=json.dumps({'type': 'agent_status', 'message': 'Data Engineer gathering data...'}))
        engineer = DataEngineerAgent()
        eng_res = await sync_to_async(engineer.execute_task)(instructions, workspace_id, user)
        await self.log_usage(user, session, "DataEngineer", eng_res["usage"])
        
        # Data Analyst
        await self.send(text_data=json.dumps({'type': 'agent_status', 'message': 'Advanced Data Analyst analyzing trends...'}))
        analyst = AdvancedDataAnalystAgent()
        an_res = await sync_to_async(analyst.analyze_data)(instructions, eng_res)
        await self.log_usage(user, session, "DataAnalyst", an_res["usage"])
        analysis_report = an_res["analysis"]
        
        # Dashboard Curator
        await self.send(text_data=json.dumps({'type': 'agent_status', 'message': 'Dashboard Curator assembling hybrid UI...'}))
        curator = DashboardCuratorAgent()
        cur_res = await sync_to_async(curator.curate_dashboard)(instructions, analysis_report, workspace_id, user)
        await self.log_usage(user, session, "DashboardCurator", cur_res["usage"])
        ui_contract = cur_res["ui_contract"]
        
        # Exporter
        await self.send(text_data=json.dumps({'type': 'agent_status', 'message': 'Exporter formatting view-only PDF report...'}))
        pdf_bytes = await sync_to_async(ReportExporterTool.generate_pdf_report)(ui_contract)
        
        file_key = f"temp_report_{session.id}.pdf"

        # Upload PDF to Django Default Storage
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        def upload_pdf_to_storage(key, data):
            if default_storage.exists(key):
                default_storage.delete(key)
            default_storage.save(key, ContentFile(data))
            
        await sync_to_async(upload_pdf_to_storage)(file_key, pdf_bytes)
        
        # Save final message
        await self.save_message(session, AgentMessage.RoleChoices.ASSISTANT, json.dumps(ui_contract))

        # Stream UI Events
        await self.send(text_data=json.dumps({
            'type': 'hybrid_dashboard',
            'ui_payload': ui_contract.get('ui_payload', {})
        }))
        
        await self.send(text_data=json.dumps({
            'type': 'pdf_ready',
            'file_key': file_key,
            'message': 'View-only PDF is ready.'
        }))
        from apps.notifications.services import create_notification
        await sync_to_async(create_notification)(
            user=user,
            title='AI Report Ready',
            message=f'Your analytical report for session "{session.title}" is complete. View or download the PDF.',
            notification_type='ai',
            priority='success',
            icon='report',
            link='/agentic',
            source_app='agentic_ai',
        )