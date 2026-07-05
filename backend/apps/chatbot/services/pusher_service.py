import pusher
from django.conf import settings

def get_pusher_client():
    if not all([settings.PUSHER_APP_ID, settings.PUSHER_KEY, settings.PUSHER_SECRET, settings.PUSHER_CLUSTER]):
        import logging
        logging.getLogger(__name__).warning("Pusher is not fully configured.")
        return None

    return pusher.Pusher(
        app_id=settings.PUSHER_APP_ID,
        key=settings.PUSHER_KEY,
        secret=settings.PUSHER_SECRET,
        cluster=settings.PUSHER_CLUSTER,
        ssl=True
    )

def send_chat_response(user_id: int, data: dict):
    client = get_pusher_client()
    if client:
        client.trigger(f'private-chat-{user_id}', 'chat-response', data)

def send_chat_error(user_id: int, error_msg: str):
    client = get_pusher_client()
    if client:
        client.trigger(f'private-chat-{user_id}', 'chat-error', {"error": error_msg})
