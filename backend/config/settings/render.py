from .base import *
from .base import env

DEBUG = False

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['.onrender.com', 'smartmoveanalytics.me', 'www.smartmoveanalytics.me'])

# --- Security ---
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# We use the CompletelyOpenCSRFMiddleware similar to production to handle cross-origin
# from Vercel to Render easily.
class CompletelyOpenCSRFMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        host = request.get_host()
        scheme = request.scheme
        request.META['HTTP_ORIGIN'] = f"{scheme}://{host}"
        if 'HTTP_REFERER' in request.META:
            request.META['HTTP_REFERER'] = f"{scheme}://{host}/"
        return self.get_response(request)

MIDDLEWARE.insert(
    MIDDLEWARE.index('django.middleware.csrf.CsrfViewMiddleware'),
    'config.settings.render.CompletelyOpenCSRFMiddleware'
)

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
import dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=env('DATABASE_URL', default=''),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

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
