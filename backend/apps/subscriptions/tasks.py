# Celery background tasks (asynchronous triggers for Airflow or internal mailing)
from celery import shared_task
from django.contrib.auth import get_user_model
import logging
from apps.smartmove_cloud.utils import set_user_quota

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task
def sync_minio_quota_task(user_id: int, new_quota_gb: int) -> None:
    """
    Asynchronously connects to Oracle Cloud MinIO to update the user's bucket policy.
    Fired by webhooks.py so the Stripe HTTP response isn't delayed.
    """
    try:
        # Execute the physical infrastructure update
        set_user_quota(user_id, new_quota_gb)
        logger.info(f"Successfully synced MinIO quota for user {user_id} to {new_quota_gb}GB.")
    except Exception as e:
        logger.error(f"Failed to sync MinIO quota for user {user_id}: {e}")
        raise