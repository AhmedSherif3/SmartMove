import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django_ratelimit.decorators import ratelimit
# pyrefly: ignore [missing-source-for-stubs]
import requests

from apps.users.permissions import IsSmartMoveAdmin
from apps.users.models import AuditLog

logger = logging.getLogger(__name__)

from .serializers import (
    RegisterSerializer, LoginSerializer, UserProfileSerializer,
    VerifyEmailSerializer, ResendOTPSerializer,
    ForgotPasswordSerializer, VerifyForgotOTPSerializer,
    ResetPasswordSerializer, ChangePasswordRequestSerializer,
    ChangePasswordVerifySerializer, UpdateRegionSerializer,
    UpdateUserRoleSerializer, SocialAuthRegionSerializer
)
from .otp_utils import generate_otp, verify_otp
from .email_utils import send_otp_email

User = get_user_model()


def set_auth_cookies(response, access_token, refresh_token):
    samesite = getattr(settings, 'AUTH_COOKIE_SAMESITE', 'Lax')
    secure   = getattr(settings, 'AUTH_COOKIE_SECURE', False)
    domain   = getattr(settings, 'AUTH_COOKIE_DOMAIN', None)
    response.set_cookie(
        'access_token', str(access_token),
        httponly=True, samesite=samesite, secure=secure, domain=domain
    )
    response.set_cookie(
        'refresh_token', str(refresh_token),
        httponly=True, samesite=samesite, secure=secure, domain=domain
    )
    return response


def issue_jwt(user):
    refresh = RefreshToken.for_user(user)
    return refresh.access_token, refresh


# ─────────────────────────────────────────────
# REGISTRATION & EMAIL VERIFICATION
# ─────────────────────────────────────────────

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfCookieView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'detail': 'CSRF cookie set'})

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        otp = generate_otp(user, 'verify_email')
        send_otp_email(user, otp.code, 'verify_email')

        return Response({
            'message': 'Account created. Check your email for the verification code.',
            'email': user.email
        }, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(
                email=serializer.validated_data['email']
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        valid, error = verify_otp(
            user,
            serializer.validated_data['otp'],
            'verify_email'
        )
        if not valid:
            return Response(
                {'error': error},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_verified = True
        user.save()

        return Response({
            'message': 'Email verified. You can now log in.'
        })


class ResendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(
                email=serializer.validated_data['email']
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        otp = generate_otp(user, serializer.validated_data['purpose'])
        send_otp_email(user, otp.code, serializer.validated_data['purpose'])

        return Response({'message': 'OTP sent successfully.'})


# ─────────────────────────────────────────────
# LOGIN & LOGOUT
# ─────────────────────────────────────────────

def _get_client_ip(request):
    """Extract the real client IP, respecting X-Forwarded-For behind a proxy."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


@method_decorator(
    ratelimit(key='ip', rate='5/m', method='POST', block=True),
    name='dispatch',
)
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        client_ip = _get_client_ip(request)

        user = authenticate(
            request,
            username=email,
            password=serializer.validated_data['password']
        )
        if not user:
            # --- Audit log: failed login attempt ---
            AuditLog.objects.create(
                user=None,
                action=f'LOGIN_FAILED: invalid credentials for {email}',
                ip_address=client_ip,
            )
            logger.warning(
                'Failed login attempt',
                extra={'email': email, 'ip': client_ip},
            )
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_verified:
            otp = generate_otp(user, 'verify_email')
            send_otp_email(user, otp.code, 'verify_email')
            # --- Audit log: unverified login attempt ---
            AuditLog.objects.create(
                user=user,
                action='LOGIN_FAILED: email not verified',
                ip_address=client_ip,
            )
            return Response({
                'error': 'Email not verified. A new code has been sent.'
            }, status=status.HTTP_403_FORBIDDEN)

        # --- Audit log: successful login ---
        AuditLog.objects.create(
            user=user,
            action='LOGIN_SUCCESS',
            ip_address=client_ip,
        )

        access, refresh = issue_jwt(user)
        response = Response({
            'user_id':           user.id,
            'email':             user.email,
            'role':              user.role,
            'region':            user.region,
            'is_verified':       user.is_verified,
            'auth_provider':     user.auth_provider,
            'access_expires_in': 900,
        })
        return set_auth_cookies(response, access, refresh)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Blacklist the refresh token so it can't be reused
        raw_token = request.COOKIES.get('refresh_token')
        if raw_token:
            try:
                token = RefreshToken(raw_token)
                token.blacklist()
            except Exception:
                pass  # Token already expired or blacklisted — still clear cookies

        response = Response(status=status.HTTP_200_OK)
        
        samesite = getattr(settings, 'AUTH_COOKIE_SAMESITE', 'Lax')
        domain = getattr(settings, 'AUTH_COOKIE_DOMAIN', None)
        secure = getattr(settings, 'AUTH_COOKIE_SECURE', False)
        
        for cookie_name in ['access_token', 'refresh_token', 'csrftoken']:
            response.set_cookie(
                cookie_name, 
                value='', 
                max_age=0, 
                expires='Thu, 01 Jan 1970 00:00:00 GMT', 
                path='/', 
                domain=domain, 
                secure=secure, 
                samesite=samesite
            )
        
        return response


class RefreshView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.COOKIES.get('refresh_token')
        if not token:
            return Response(
                {'error': 'No refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            refresh  = RefreshToken(token)
            response = Response({'access_expires_in': 900})
            return set_auth_cookies(
                response, refresh.access_token, refresh
            )
        except Exception:
            return Response(
                {'error': 'Invalid or expired refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )


# ─────────────────────────────────────────────
# FORGOT PASSWORD (not logged in)
# ─────────────────────────────────────────────

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(
                email=serializer.validated_data['email']
            )
            otp = generate_otp(user, 'reset_password')
            send_otp_email(user, otp.code, 'reset_password')
        except User.DoesNotExist:
            pass  # Don't reveal if email exists

        return Response({
            'message': 'If this email exists, a reset code has been sent.'
        })


class VerifyForgotOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyForgotOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(
                email=serializer.validated_data['email']
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        valid, error = verify_otp(
            user,
            serializer.validated_data['code'],
            'reset_password'
        )
        if not valid:
            return Response(
                {'error': error},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'message': 'OTP verified. You can now reset your password.',
            'email': user.email
        })


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(
                email=serializer.validated_data['email']
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify OTP one more time for security
        valid, error = verify_otp(
            user,
            serializer.validated_data['code'],
            'reset_password'
        )
        if not valid:
            return Response(
                {'error': error},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({
            'message': 'Password reset successfully. You can now log in.'
        })


# ─────────────────────────────────────────────
# CHANGE PASSWORD (logged in — from settings)
# ─────────────────────────────────────────────

class ChangePasswordRequestView(APIView):

    def post(self, request):
        serializer = ChangePasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(
            serializer.validated_data['old_password']
        ):
            return Response(
                {'error': 'Old password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp = generate_otp(request.user, 'change_password')
        send_otp_email(request.user, otp.code, 'change_password')

        return Response({
            'message': 'Verification code sent to your email.'
        })


class ChangePasswordVerifyView(APIView):

    def post(self, request):
        serializer = ChangePasswordVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        valid, error = verify_otp(
            request.user,
            serializer.validated_data['code'],
            'change_password'
        )
        if not valid:
            return Response(
                {'error': error},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(
            serializer.validated_data['new_password']
        )
        request.user.save()

        return Response({
            'message': 'Password changed successfully.'
        })


# ─────────────────────────────────────────────
# REGION UPDATE (logged in)
# ─────────────────────────────────────────────

class UpdateRegionView(APIView):

    def patch(self, request):
        serializer = UpdateRegionSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'message': 'Region updated successfully.',
            'region': request.user.region
        })


# ─────────────────────────────────────────────
# ADMIN — UPDATE USER ROLE
# ─────────────────────────────────────────────

class UpdateUserRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSmartMoveAdmin]

    def patch(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        serializer = UpdateUserRoleSerializer(
            user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(user).data)


# ─────────────────────────────────────────────
# SOCIAL AUTH — GOOGLE
# ─────────────────────────────────────────────

class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Frontend sends the Google access token
        google_token = request.data.get('token')
        if not google_token:
            return Response(
                {'error': 'Google token required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify token with Google
        google_response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {google_token}'}
        )

        if google_response.status_code != 200:
            return Response(
                {'error': 'Invalid Google token'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        google_data = google_response.json()
        email      = google_data.get('email')
        first_name = google_data.get('given_name', '')
        last_name  = google_data.get('family_name', '')

        if not email:
            return Response(
                {'error': 'Could not get email from Google'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name':    first_name,
                'last_name':     last_name,
                'auth_provider': 'google',
                'is_verified':   True,
                'role':          User.Role.USER,
            }
        )

        # If user exists but used email login before
        if not created and user.auth_provider == 'email':
            return Response({
                'error': 'This email is registered with email/password. Please login normally.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # If first time — region not set yet
        if not user.region:
            return Response({
                'requires_region': True,
                'email': email,
                'message': 'Please select your region to continue.'
            }, status=status.HTTP_200_OK)

        access, refresh = issue_jwt(user)
        response = Response({
            'user_id':           user.id,
            'email':             user.email,
            'role':              user.role,
            'region':            user.region,
            'is_verified':       user.is_verified,
            'auth_provider':     user.auth_provider,
            'access_expires_in': 900,
        })
        return set_auth_cookies(response, access, refresh)


class GoogleAuthSetRegionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email      = request.data.get('email')
        serializer = SocialAuthRegionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(email=email, auth_provider='google')
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user.region = serializer.validated_data['region']
        user.save()

        access, refresh = issue_jwt(user)
        response = Response({
            'user_id':           user.id,
            'email':             user.email,
            'role':              user.role,
            'region':            user.region,
            'is_verified':       user.is_verified,
            'auth_provider':     user.auth_provider,
            'access_expires_in': 900,
        })
        return set_auth_cookies(response, access, refresh)


# ─────────────────────────────────────────────
# SOCIAL AUTH — MICROSOFT
# ─────────────────────────────────────────────

class MicrosoftAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ms_token = request.data.get('token')
        if not ms_token:
            return Response(
                {'error': 'Microsoft token required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify token with Microsoft Graph
        ms_response = requests.get(
            'https://graph.microsoft.com/v1.0/me',
            headers={'Authorization': f'Bearer {ms_token}'}
        )

        if ms_response.status_code != 200:
            return Response(
                {'error': 'Invalid Microsoft token'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        ms_data    = ms_response.json()
        email      = ms_data.get('mail') or ms_data.get('userPrincipalName')
        first_name = ms_data.get('givenName', '')
        last_name  = ms_data.get('surname', '')

        if not email:
            return Response(
                {'error': 'Could not get email from Microsoft'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name':    first_name,
                'last_name':     last_name,
                'auth_provider': 'microsoft',
                'is_verified':   True,
                'role':          User.Role.USER,
            }
        )

        if not created and user.auth_provider == 'email':
            return Response({
                'error': 'This email is registered with email/password. Please login normally.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not user.region:
            return Response({
                'requires_region': True,
                'email': email,
                'message': 'Please select your region to continue.'
            }, status=status.HTTP_200_OK)

        access, refresh = issue_jwt(user)
        response = Response({
            'user_id':           user.id,
            'email':             user.email,
            'role':              user.role,
            'region':            user.region,
            'is_verified':       user.is_verified,
            'auth_provider':     user.auth_provider,
            'access_expires_in': 900,
        })
        return set_auth_cookies(response, access, refresh)


class MicrosoftAuthSetRegionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email      = request.data.get('email')
        serializer = SocialAuthRegionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(
                email=email, auth_provider='microsoft'
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user.region = serializer.validated_data['region']
        user.save()

        access, refresh = issue_jwt(user)
        response = Response({
            'user_id':           user.id,
            'email':             user.email,
            'role':              user.role,
            'region':            user.region,
            'is_verified':       user.is_verified,
            'auth_provider':     user.auth_provider,
            'access_expires_in': 900,
        })
        return set_auth_cookies(response, access, refresh)