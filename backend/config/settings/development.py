from .base import *
from .base import env

DEBUG = True
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', 'backend'])

# Override Cache to use Local Memory instead of Redis in development to prevent ConnectionErrors on ratelimit
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'