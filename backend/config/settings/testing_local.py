"""
Test settings for Airflow SQL integration tests.

Uses SQLite in-memory database — no PostgreSQL server required.
Suitable for local development and CI environments without Docker.
"""
from .base import *  # noqa: F401,F403

DEBUG = True

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    },
    'azure': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    },
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable Sentry during tests
SENTRY_DSN = ''

# Disable OpenTelemetry during tests
OTEL_ENABLED = False
