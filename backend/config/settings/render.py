from .base import *
from .base import env

DEBUG = False

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['.onrender.com', 'smartmoveanalytics.me', 'www.smartmoveanalytics.me'])

# --- Security ---
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# --- CSRF & Cookies ---
# We use standard Django CSRF middleware, relying on CSRF_TRUSTED_ORIGINS
# being properly set in the environment or base.py.

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = 'None'
AUTH_COOKIE_SAMESITE = env('AUTH_COOKIE_SAMESITE', default='None')
AUTH_COOKIE_SECURE = env.bool('AUTH_COOKIE_SECURE', default=True)

# --- Static files ---
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# --- Database ---
# Inheriting DATABASES from base.py since we are using individual DB_HOST, DB_NAME variables 
# in Render instead of a single DATABASE_URL string.

# Preserve Azure Analytics Database connection if USE_AZURE_DB is True
if env.bool('USE_AZURE_DB', default=False):
    DATABASES['azure'] = {
        'ENGINE': 'mssql',
        'NAME': env('AZURE_SQL_DB_NAME', default='smartmove-global'),
        'USER': env('AZURE_SQL_USER', default=''),
        'PASSWORD': env('AZURE_SQL_PASSWORD', default=''),
        'HOST': env('AZURE_SQL_HOST', default=''),
        'PORT': env('AZURE_SQL_PORT', default='1433'),
        'OPTIONS': {
            'driver': 'ODBC Driver 18 for SQL Server',
        },
    }

# --- Cache ---
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}
