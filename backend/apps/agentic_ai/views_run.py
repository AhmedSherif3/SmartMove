import threading
import logging
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_agentic(request):
    try:
        data = request.data
        prompt = data.get('prompt')
        session_id = data.get('session_id')

        if not prompt or not session_id:
            return JsonResponse({"error": "Prompt and session_id are required"}, status=400)

        from apps.agentic_ai.tasks import run_agentic_swarm

        # Try Celery first, fall back to background thread if no worker is available
        try:
            run_agentic_swarm.delay(session_id, prompt, request.user.id)
        except Exception as celery_err:
            logger.warning(f"Celery unavailable ({celery_err}), running in background thread.")
            t = threading.Thread(
                target=run_agentic_swarm,
                args=(session_id, prompt, request.user.id),
                daemon=True
            )
            t.start()

        return JsonResponse({
            "status": "processing",
            "message": "Request accepted. Response will be pushed via Pusher."
        }, status=202)
        
    except Exception as e:
        logger.exception("Failed to accept agentic message")
        return JsonResponse({"error": str(e)}, status=500)
