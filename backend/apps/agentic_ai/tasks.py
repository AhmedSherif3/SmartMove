# Celery Tasks (Background memory summarization)
import os
from celery import shared_task
from django.conf import settings
from google import genai
from apps.agentic_ai.models import AgentSession, AgentMessage
from apps.agentic_ai.utils.constants import AI_MODEL_ROUTING
from asgiref.sync import async_to_sync

@shared_task
def run_agentic_swarm(session_id: str, user_prompt: str, user_id: int):
    from apps.agentic_ai.agents.orchestrator import SupervisorAgent
    from apps.agentic_ai.agents.data_engineer import DataEngineerAgent
    from apps.agentic_ai.agents.data_analyst import AdvancedDataAnalystAgent
    from apps.agentic_ai.agents.dashboard_curator import DashboardCuratorAgent
    from apps.agentic_ai.tools.report_exporter import ReportExporterTool
    from apps.chatbot.services.pusher_service import get_pusher_client
    from django.contrib.auth import get_user_model
    import json
    
    User = get_user_model()
    user = User.objects.get(id=user_id)
    pusher = get_pusher_client()
    channel = f'private-agentic-{session_id}'
    
    try:
        import uuid
        session_uuid = uuid.UUID(str(session_id))
    except (ValueError, TypeError):
        # pyrefly: ignore [unbound-name]
        session_uuid = uuid.uuid4()
        
    # pyrefly: ignore [missing-attribute]
    session, _ = AgentSession.objects.get_or_create(
        id=session_uuid,
        defaults={'user': user, 'title': 'New Analytical Session'}
    )
    workspace_id = str(session.workspace.id) if session.workspace else None

    # Save User Message
    # pyrefly: ignore [missing-attribute]
    AgentMessage.objects.create(session=session, role=AgentMessage.RoleChoices.USER, content=user_prompt)
    if pusher:
        pusher.trigger(channel, 'agentic-message', {'type': 'user_message', 'message': user_prompt})
        pusher.trigger(channel, 'agentic-message', {'type': 'agent_status', 'message': 'Supervisor is analyzing request...'})

    # Get History
        # pyrefly: ignore [missing-attribute]
    msgs = AgentMessage.objects.filter(session=session).order_by('-created_at')[:5]
    history = [{"role": m.role, "content": m.content} for m in reversed(msgs)]

    try:
        # Supervisor
        supervisor = SupervisorAgent()
        route_res = supervisor.route_query(user_prompt, history)
        decision = route_res["decision"]
        target = decision.get("target_agent", "COMPOUND_PIPELINE")
        instructions = decision.get("instructions", user_prompt)

        if target == "COMPOUND_PIPELINE":
            if pusher: pusher.trigger(channel, 'agentic-message', {'type': 'agent_status', 'message': 'Data Engineer gathering data...'})
            engineer = DataEngineerAgent()
            eng_res = engineer.execute_task(instructions, workspace_id, user)

            if pusher: pusher.trigger(channel, 'agentic-message', {'type': 'agent_status', 'message': 'Advanced Data Analyst analyzing trends...'})
            analyst = AdvancedDataAnalystAgent()
            an_res = analyst.analyze_data(instructions, eng_res)
            analysis_report = an_res["analysis"]

            if pusher: pusher.trigger(channel, 'agentic-message', {'type': 'agent_status', 'message': 'Dashboard Curator assembling hybrid UI...'})
            curator = DashboardCuratorAgent()
            cur_res = curator.curate_dashboard(instructions, analysis_report, workspace_id, user)
            ui_contract = cur_res["ui_contract"]



            # pyrefly: ignore [missing-attribute]
            AgentMessage.objects.create(session=session, role=AgentMessage.RoleChoices.ASSISTANT, content=json.dumps(ui_contract))

            if pusher:
                pusher.trigger(channel, 'agentic-message', {
                    'type': 'hybrid_dashboard',
                    'ui_payload': ui_contract.get('ui_payload', ui_contract)
                })

        else:
            if pusher: pusher.trigger(channel, 'agentic-message', {'type': 'agent_status', 'message': f'Routing to {target}...'})
            # fallback

        try:
            compress_session_memory.delay(session_id)
        except Exception as cel_err:
            pass

    except Exception as e:
        if pusher:
            pusher.trigger(channel, 'agentic-message', {'type': 'error', 'message': str(e)})

@shared_task
def compress_session_memory(session_id: str):
    """
    Background worker that prevents OpenAI token limits from blowing up.
    Summarizes older chat history using the fast, cheap Gemini 3.5 Flash model.
    """
        # pyrefly: ignore [missing-attribute]
    session = AgentSession.objects.get(id=session_id)
    
    # Get all messages except the 4 most recent ones (keep recent context fresh)
    # pyrefly: ignore [missing-attribute]
    old_messages = AgentMessage.objects.filter(session=session).order_by('created_at')
    
    if old_messages.count() <= 6:
        return "Not enough memory to compress."

    messages_to_compress = old_messages[:-4]
    
    # Format the old conversation into a single string
    conversation_log = "\n".join([f"{msg.role.upper()}: {msg.content}" for msg in messages_to_compress])

    # Spin up Gemini 3.5 Flash to summarize (it's virtually free for text)
    api_key = getattr(settings, 'GEMINI_API_KEY', os.environ.get('GEMINI_API_KEY'))
    client = genai.Client(api_key=api_key)
    config = AI_MODEL_ROUTING["UI_DESIGNER"] # Re-using the Flash config

    system_instruction = (
        "You are an AI Memory Compressor. Summarize the user's goals and the AI's "
        "previous actions from the conversation log. Keep it under 3 sentences. "
        "Retain critical facts (like requested regions or specific metric filters)."
    )

    prompt = f"Conversation Log:\n{conversation_log}"

    try:
        response = client.models.generate_content(
            model=config["model_name"],
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.0
            )
        )
        
        summary_text = response.text or "Previous context compressed."

        # Delete the old verbose messages
        for msg in messages_to_compress:
            msg.delete()

        # Insert the single summary message at the top of the timeline
            # pyrefly: ignore [missing-attribute]
        AgentMessage.objects.create(
            session=session,
            role=AgentMessage.RoleChoices.SYSTEM,
            content=f"[SYSTEM: Memory Compressed] {summary_text}",
            token_count=0 
        )

        return "Memory compression successful."
        
    except Exception as e:
        return f"Memory compression failed: {str(e)}"