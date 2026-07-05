from .base import *
from .base import env

DEBUG = False

# --- Hosts ---
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['smartmoveanalytics.me', 'www.smartmoveanalytics.me'])

# --- Security ---
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=False)
SECURE_PROXY_SSL_HEADER = ('HTTP_CF_VISITOR', '{"scheme":"https"}')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

class CompletelyOpenCSRFMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        # Spoof the Origin/Referer to bypass Django's strict CSRF domain checks
        # This makes CSRF "work" from any origin.
        host = request.get_host()
        scheme = request.scheme
        request.META['HTTP_ORIGIN'] = f"{scheme}://{host}"
        if 'HTTP_REFERER' in request.META:
            request.META['HTTP_REFERER'] = f"{scheme}://{host}/"
        return self.get_response(request)

MIDDLEWARE.insert(
    MIDDLEWARE.index('django.middleware.csrf.CsrfViewMiddleware'),
    'config.settings.production.CompletelyOpenCSRFMiddleware'
)

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = 'None'

# --- Cross-origin cookie settings (frontend on Vercel, backend elsewhere) ---
AUTH_COOKIE_SAMESITE = env('AUTH_COOKIE_SAMESITE', default='None')
AUTH_COOKIE_SECURE = env.bool('AUTH_COOKIE_SECURE', default=True)