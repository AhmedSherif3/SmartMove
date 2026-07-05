import json
import threading
import logging
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.conf import settings

from apps.chatbot.services.pusher_service import get_pusher_client
from apps.chatbot.services.react_agent import run_agent
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pusher_auth(request):
    """
    Endpoint for Pusher client to authenticate private channels.
    """
    client = get_pusher_client()
    if not client:
        return JsonResponse({"error": "Pusher not configured"}, status=500)

    try:
        channel_name = request.data.get('channel_name') or request.POST.get('channel_name')
        socket_id = request.data.get('socket_id') or request.POST.get('socket_id')
        
        # Verify the user is subscribing to their own chat channel or an agentic channel
        expected_chat_channel = f"private-chat-{request.user.id}"
        
        if channel_name != expected_chat_channel and not channel_name.startswith("private-agentic-"):
            return HttpResponseForbidden("Unauthorized channel")

        auth = client.authenticate(channel=channel_name, socket_id=socket_id)
        return JsonResponse(auth)
    except Exception as e:
        logger.error(f"Pusher auth failed: {e}")
        return JsonResponse({"error": str(e)}, status=403)

def _process_chat_message(user, message_text: str, session_id: str, currency: str):
    from apps.chatbot.services.pusher_service import send_chat_response, send_chat_error
    try:
        response = async_to_sync(run_agent)(
            user_message=message_text,
            user_role=getattr(user, 'role', 'USER'),
            currency=currency,
            session_id=session_id,
            user_id=user.id
        )
        
        # Save messages to DB here if needed
        # ...
        
        send_chat_response(user.id, {
            "type": "ai_response",
            "content": response.get("text", ""),
            "charts": response.get("charts", []),
            "chips": response.get("follow_up_chips", [])
        })
    except Exception as e:
        logger.exception("Chat background task failed")
        send_chat_error(user.id, "Sorry, I encountered an error processing your request.")

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_message(request):
    """
    Receives a message, spawns a background thread to process it with LLM, 
    and returns 202 Accepted. The LLM result will be pushed via Pusher.
    """
    try:
        data = request.data
        message_text = data.get('message')
        session_id = data.get('session_id')
        currency = data.get('currency', 'EGP')

        if not message_text or not session_id:
            return JsonResponse({"error": "Message and session_id are required"}, status=400)

        # Basic rate limits can be checked here before spawning thread
        # ...

        # Spawn background thread for LLM processing
        thread = threading.Thread(
            target=_process_chat_message,
            args=(request.user, message_text, session_id, currency)
        )
        thread.start()

        return JsonResponse({
            "status": "processing",
            "message": "Request accepted. Response will be pushed via Pusher."
        }, status=202)
        
    except Exception as e:
        logger.exception("Failed to accept chat message")
        return JsonResponse({"error": "Internal server error"}, status=500)
