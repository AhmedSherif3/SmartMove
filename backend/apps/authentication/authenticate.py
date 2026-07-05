
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import CSRFCheck
from rest_framework import exceptions

class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom authentication class that extracts the JWT from an HttpOnly cookie.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        
        if header is None:
            raw_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE']) or None
            using_cookie = True
        else:
            raw_token = self.get_raw_token(header)
            using_cookie = False

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        
        # Only enforce CSRF if the token came from a cookie, not from the Authorization header
        if using_cookie:
            self.enforce_csrf(request)

        return self.get_user(validated_token), validated_token

    def enforce_csrf(self, request):
        check = CSRFCheck(lambda r: None) # Dummy view
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')


class CookieJWTAuthenticationNoCSRF(CookieJWTAuthentication):
    """
    Cookie JWT authentication without CSRF enforcement.
    Use only for endpoints where CSRF is handled out of band.
    """

    def enforce_csrf(self, request):
        return
