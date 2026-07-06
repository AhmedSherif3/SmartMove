import os
from pathlib import Path
import environ

# Default configuration loaded from .env file

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY', default='insecure-fallback-key-change-me')
DEBUG = env.bool('DEBUG', default=True)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '0.0.0.0', 'smartmoveanalytics.me', 'www.smartmoveanalytics.me'])

# Render disables server-dependent components
IS_RENDER = env.bool('IS_RENDER', default=(env('DJANGO_SETTINGS_MODULE', default='') == 'config.settings.render'))

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'drf_spectacular',
    'corsheaders',
    'apps.authentication',
    'apps.users',
    'apps.upload',
    'apps.dashboard',
    'apps.reports',
    'apps.predictions',
    'apps.chatbot',
    'apps.monitoring',
    'apps.notifications',
    'rest_framework_simplejwt.token_blacklist',
    'apps.integrations',
    'apps.currency',
    'apps.smartmove_cloud',
    'apps.analytics_pro_engine',
    'apps.subscriptions',
    'apps.core',
    'apps.agentic_ai',
]

if not IS_RENDER:
    INSTALLED_APPS.append('django_prometheus')


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.authentication.authenticate.CookieJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SAMESITE': 'Lax',
}

NOTIFICATION_RETENTION_DAYS = 90

SPECTACULAR_SETTINGS = {
    'TITLE': 'SmartMove API',
    'VERSION': '1.0.0',
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

if not IS_RENDER:
    MIDDLEWARE.insert(0, 'django_prometheus.middleware.PrometheusBeforeMiddleware')
    MIDDLEWARE.append('django_prometheus.middleware.PrometheusAfterMiddleware')

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME', default=''),
        'USER': env('DB_USER', default=''),
        'PASSWORD': env('DB_PASSWORD', default=''),
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT', default='5432'),
        'OPTIONS': {'sslmode': 'require'},
    },
}

# Analytics warehouse — Azure SQL (MSSQL).  Only added when the ODBC driver
# is available (i.e. in Docker / staging / production).  Set USE_AZURE_DB=True
# in .env or docker-compose to activate.
import os
if os.environ.get('USE_AZURE_DB', '').lower() == 'true':
    DATABASES['azure'] = {
        'ENGINE': 'mssql',
        'NAME': env('AZURE_SQL_DB_NAME', default='smartmove_dw'),
        'USER': env('AZURE_SQL_USER', default=''),
        'PASSWORD': env('AZURE_SQL_PASSWORD', default=''),
        'HOST': env('AZURE_SQL_HOST', default=''),
        'PORT': env('AZURE_SQL_PORT', default='1433'),
        'OPTIONS': {
            'driver': 'ODBC Driver 18 for SQL Server',
        },
    }

REDIS_URL = env('REDIS_URL', default='redis://localhost:6379')

if not IS_RENDER:
    pass


# Cache backend — required by django-ratelimit for atomic rate-limit counters
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
    }
}

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=False)

CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=False)
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://smart-move-seven.vercel.app',
    'https://smartmoveanalytics.me',
    'https://www.smartmoveanalytics.me',
])
CORS_ALLOW_CREDENTIALS = True

# Explicitly allow the CSRF token header in cross-origin requests
from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + ['x-csrftoken']

CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://smart-move-seven.vercel.app',
    'https://smartmoveanalytics.me',
    'https://www.smartmoveanalytics.me',
])

# Cookie settings (override in production for cross-origin / HTTPS)
AUTH_COOKIE_SAMESITE = env('AUTH_COOKIE_SAMESITE', default='Lax')
AUTH_COOKIE_SECURE = env.bool('AUTH_COOKIE_SECURE', default=False)
AUTH_COOKIE_DOMAIN = env('AUTH_COOKIE_DOMAIN', default=None)
CSRF_COOKIE_DOMAIN = env('CSRF_COOKIE_DOMAIN', default=None)

# Email settings
EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST          = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT          = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS       = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER     = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = env('DEFAULT_FROM_EMAIL', default='SmartMove <noreply@smartmove.app>')

OTP_EXPIRY_MINUTES = 10

# Shared secret for the Alertmanager → SOC webhook (machine-to-machine auth).
# If empty, HasAlertmanagerSecret fails closed (denies all requests).
ALERTMANAGER_SECRET_TOKEN = env('ALERTMANAGER_SECRET_TOKEN', default='')

import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration

SENTRY_DSN = env('SENTRY_DSN', default='')

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        environment=env('SENTRY_ENVIRONMENT', default='development'),
        traces_sample_rate=0.2,
        send_default_pii=False,
    )
# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Structured JSON Logging for Grafana Loki
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(levelname)s %(asctime)s %(name)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': True,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# ==============================================================================
# OpenTelemetry — Distributed Tracing to SOC Command Center (Tempo)
#
# Sends traces via OTLP/gRPC to the Tempo container on the command-center node.
# Set OTEL_ENABLED=True and OTEL_EXPORTER_OTLP_ENDPOINT in .env to activate.
#
# Required packages (in requirements/base.txt):
#   opentelemetry-distro, opentelemetry-exporter-otlp,
#   opentelemetry-instrumentation-django
# ==============================================================================

OTEL_ENABLED = env.bool('OTEL_ENABLED', default=False)
OTEL_EXPORTER_OTLP_ENDPOINT = env(
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    default='http://<COMMAND_CENTER_IP>:4317',
)
OTEL_SERVICE_NAME = env('OTEL_SERVICE_NAME', default='smartmove-backend')

if OTEL_ENABLED:
    from opentelemetry import trace  # type: ignore[import-not-found]
    from opentelemetry.sdk.trace import TracerProvider  # type: ignore[import-not-found]
    from opentelemetry.sdk.trace.export import BatchSpanProcessor  # type: ignore[import-not-found]
    from opentelemetry.sdk.resources import Resource, SERVICE_NAME  # type: ignore[import-not-found]
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter  # type: ignore[import-not-found]
    from opentelemetry.instrumentation.django import DjangoInstrumentor  # type: ignore[import-not-found]

    # ── Resource: identifies this service in Tempo/Grafana ────
    otel_resource = Resource.create({
        SERVICE_NAME: OTEL_SERVICE_NAME,
        'deployment.environment': env('SENTRY_ENVIRONMENT', default='development'),
        'service.version': SPECTACULAR_SETTINGS.get('VERSION', '1.0.0'),
    })

    # ── TracerProvider + OTLP Exporter → Tempo ────────────────
    tracer_provider = TracerProvider(resource=otel_resource)

    otlp_exporter = OTLPSpanExporter(
        endpoint=OTEL_EXPORTER_OTLP_ENDPOINT,
        insecure=True,  # Tailscale provides encryption; no TLS needed
    )

    tracer_provider.add_span_processor(
        BatchSpanProcessor(otlp_exporter)
    )

    trace.set_tracer_provider(tracer_provider)

    # ── Auto-instrument Django requests ───────────────────────
    DjangoInstrumentor().instrument()

# ==============================================================================
# Custom SmartMove Settings
# ==============================================================================

# Azure Blob Storage Connection
AZURE_STORAGE_CONNECTION_STRING = env('AZURE_STORAGE_CONNECTION_STRING', default='')

# Azure Blob Storage Regional Containers
AZURE_CONTAINER_ENGLAND = env('AZURE_CONTAINER_ENGLAND', default='england-landing-bucket')
AZURE_CONTAINER_DUBAI = env('AZURE_CONTAINER_DUBAI', default='dubai-landing-bucket')
AZURE_CONTAINER_EGYPT = env('AZURE_CONTAINER_EGYPT', default='egy-landing-bucket')

# Airflow Webhook Authentication (machine-to-machine shared secret)
AIRFLOW_WEBHOOK_SECRET = env('AIRFLOW_WEBHOOK_SECRET', default='')

# Lemon Squeezy Billing Integration
LEMON_SQUEEZY_API_KEY = env('LEMON_SQUEEZY_API_KEY', default='')
LEMON_SQUEEZY_STORE_ID = env('LEMON_SQUEEZY_STORE_ID', default='')
LEMON_SQUEEZY_WEBHOOK_SECRET = env('LEMON_SQUEEZY_WEBHOOK_SECRET', default='')

# Subscriptions Mapping Structure
LEMON_SQUEEZY_PLAN_MAP = {
    'analyst':             {'variant_id': env('LEMON_SQUEEZY_VARIANT_ANALYST', default=''),             'plan_type': 'analyst',             'category': 'role'},
    'analyst_pro_max':     {'variant_id': env('LEMON_SQUEEZY_VARIANT_ANALYST_PRO_MAX', default=''),     'plan_type': 'analyst_pro_max',     'category': 'role'},
    'storage_per_gb':      {'variant_id': env('LEMON_SQUEEZY_VARIANT_STORAGE_PER_GB', default=''),      'plan_type': 'storage_per_gb',      'category': 'storage'},
    'storage_5gb':         {'variant_id': env('LEMON_SQUEEZY_VARIANT_STORAGE_5GB', default=''),         'plan_type': 'storage_5gb',         'category': 'storage'},
    'storage_9gb':         {'variant_id': env('LEMON_SQUEEZY_VARIANT_STORAGE_9GB', default=''),         'plan_type': 'storage_9gb',         'category': 'storage'},
    'report_single':       {'variant_id': env('LEMON_SQUEEZY_VARIANT_REPORT_SINGLE', default=''),       'plan_type': 'report_single',       'category': 'reports'},
    'report_all':          {'variant_id': env('LEMON_SQUEEZY_VARIANT_REPORT_ALL', default=''),          'plan_type': 'report_all',          'category': 'reports'},
}


# Frontend URL (used by Stripe Checkout redirect URLs)
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000')

# Oracle Cloud / MinIO Object Storage Configurations
MINIO_ENDPOINT_URL = env('MINIO_ENDPOINT_URL', default='')
MINIO_ACCESS_KEY = env('MINIO_ACCESS_KEY', default='')
MINIO_SECRET_KEY = env('MINIO_SECRET_KEY', default='')
MINIO_REGION = env('MINIO_REGION', default='us-east-1') # Adjust to your specific Oracle region
MINIO_BUCKET_NAME = env('MINIO_BUCKET_NAME', default='smartmove-data-lake')
CLAMAV_REST_URL = env('CLAMAV_REST_URL', default='http://100.99.164.119:9000/scan')

# Azure OpenAI Credentials
AZURE_OPENAI_ENDPOINT = env('AZURE_OPENAI_ENDPOINT', default='')
AZURE_OPENAI_API_KEY = env('AZURE_OPENAI_API_KEY', default='')
AZURE_OPENAI_API_VERSION = env('AZURE_OPENAI_API_VERSION', default='2024-02-01')

# New AI Credentials
GEMINI_API_KEY = env('GEMINI_API_KEY', default='')
OPENROUTER_API_KEY = env('OPENROUTER_API_KEY', default='')

# Pusher Real-time
PUSHER_APP_ID = env('PUSHER_APP_ID', default='')
PUSHER_KEY = env('PUSHER_KEY', default='')
PUSHER_SECRET = env('PUSHER_SECRET', default='')
PUSHER_CLUSTER = env('PUSHER_CLUSTER', default='')

# Email API
BREVO_API_KEY = env('BREVO_API_KEY', default='')
BREVO_SENDER_EMAIL = env('BREVO_SENDER_EMAIL', default='noreply@smartmove.app')
BREVO_SENDER_NAME = env('BREVO_SENDER_NAME', default='SmartMove')

# Storage Quota
DEFAULT_USER_STORAGE_QUOTA_MB = env.int('DEFAULT_USER_STORAGE_QUOTA_MB', default=100 if IS_RENDER else 1024)