import os
import logging

from celery import Celery
from celery.schedules import crontab

logger = logging.getLogger(__name__)

# 1. Set the default Django settings module for the 'celery' program.
# Note: Adjust 'config.settings.development' if your default is different.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

# 2. Create the Celery App instance
app = Celery('smartmove')

# 3. Read config from Django settings, the CELERY namespace means all 
# celery-related configuration keys should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# 4. Auto-discover tasks in all installed apps (like apps.upload.tasks)
app.autodiscover_tasks()

# 5. The "Zombie Killer" Cron Job (Celery Beat)
# This schedules our heartbeat check to run every 5 minutes
app.conf.beat_schedule = {
    'kill-zombie-uploads-every-5-minutes': {
        'task': 'apps.upload.tasks.kill_zombie_uploads',
        'schedule': crontab(minute='*/5'),
    },
    'check-storage-quota-warnings-hourly': {
        'task': 'apps.notifications.tasks.check_storage_quota_warnings',
        'schedule': crontab(minute=15),
    },
    'check-subscription-expiry-daily': {
        'task': 'apps.notifications.tasks.check_subscription_expiry',
        'schedule': crontab(hour=8, minute=0),
    },
    'prune-old-notifications-daily': {
        'task': 'apps.notifications.tasks.prune_old_notifications',
        'schedule': crontab(hour=3, minute=30),
    },
    'fetch-daily-exchange-rates': {
        'task': 'apps.currency.tasks.fetch_daily_exchange_rates',
        'schedule': crontab(hour=2, minute=0),  # Daily at 02:00 UTC
    },
}

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    logger.debug(f'Request: {self.request!r}')