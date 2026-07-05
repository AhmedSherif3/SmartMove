import logging

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
    BlacklistedToken,
)

from .serializers import (
    UserProfileSerializer,
    AdminUserManagementSerializer,
    ProfilePhotoSerializer,
    RequestEmailChangeSerializer,
    VerifyEmailChangeSerializer,
)
from .permissions import IsSmartMoveAdmin
from apps.authentication.otp_utils import generate_otp, verify_otp
from apps.authentication.email_utils import send_otp_email
from apps.upload import azure_utils

logger = logging.getLogger(__name__)
User = get_user_model()


# ─────────────────────────────────────────────
# PERSONAL PROFILE
# ─────────────────────────────────────────────

class CurrentUserView(generics.RetrieveUpdateAPIView):
    """GET or PATCH the currently logged-in user's profile."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # We fetch the current user and use select_related to prevent N+1 queries 
        # when serializing the nested currency object.
        return User.objects.select_related('currency_preference').get(pk=self.request.user.pk)


# ─────────────────────────────────────────────
# PROFILE PHOTO UPLOAD
# ─────────────────────────────────────────────

class UploadProfilePhotoView(APIView):
    """
    POST: Upload a profile photo image.
    The file is stored in Azure Blob Storage and a read-only SAS URL
    is saved to the user's profile_photo_url field.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = ProfilePhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        photo = serializer.validated_data['photo']

        try:
            photo_url = azure_utils.upload_profile_photo(
                user_id=request.user.id,
                file_obj=photo,
            )
        except Exception as e:
            logger.error(
                f"Profile photo upload failed: {e}",
                extra={'user_id': request.user.id},
            )
            return Response(
                {'error': f'Failed to upload photo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        request.user.profile_photo_url = photo_url
        request.user.save(update_fields=['profile_photo_url'])

        logger.info(
            "Profile photo updated",
            extra={'user_id': request.user.id},
        )

        return Response({
            'message': 'Profile photo uploaded successfully.',
            'profile_photo_url': photo_url,
        })


# ─────────────────────────────────────────────
# EMAIL CHANGE FLOW
# ─────────────────────────────────────────────

class RequestEmailChangeView(APIView):
    """
    POST: Request an email change.
    Sends an OTP to the NEW email address for verification.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RequestEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_email = serializer.validated_data['new_email']

        otp = generate_otp(request.user, 'change_email')
        send_otp_email(
            request.user,
            otp.code,
            'change_email',
            recipient_email=new_email,
        )

        logger.info(
            "Email change OTP sent",
            extra={'user_id': request.user.id, 'new_email': new_email},
        )

        return Response({
            'message': 'Verification code sent to the new email address.',
        })


class VerifyEmailChangeView(APIView):
    """
    POST: Verify the email-change OTP and apply the new email.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VerifyEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_email = serializer.validated_data['new_email']
        otp_code = serializer.validated_data['otp']

        # Check the new email isn't taken (race condition guard)
        if User.objects.filter(email=new_email).exclude(pk=request.user.pk).exists():
            return Response(
                {'error': 'This email address is already in use.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid, error = verify_otp(request.user, otp_code, 'change_email')
        if not valid:
            return Response(
                {'error': error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_email = request.user.email
        request.user.email = new_email
        request.user.save(update_fields=['email'])

        logger.info(
            f"Email changed from {old_email} to {new_email}",
            extra={'user_id': request.user.id},
        )

        return Response({
            'message': 'Email updated successfully.',
            'email': new_email,
        })


# ─────────────────────────────────────────────
# SESSION MANAGEMENT
# ─────────────────────────────────────────────

class UserSessionsView(APIView):
    """
    GET:    List all active refresh tokens for the current user.
    DELETE: Blacklist all outstanding tokens (logout from all devices).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        outstanding = OutstandingToken.objects.filter(user=request.user)  # type: ignore

        # Exclude tokens that have already been blacklisted
        blacklisted_ids = set(
            BlacklistedToken.objects.filter(  # type: ignore
                token__user=request.user
            ).values_list('token_id', flat=True)
        )

        sessions = []
        for token in outstanding:
            if token.id not in blacklisted_ids:
                sessions.append({
                    'id': token.id,
                    'created_at': token.created_at,
                    'expires_at': token.expires_at,
                })

        return Response({'active_sessions': sessions})

    def delete(self, request):
        tokens = OutstandingToken.objects.filter(user=request.user)  # type: ignore

        count = 0
        for token in tokens:
            _, created = BlacklistedToken.objects.get_or_create(token=token)  # type: ignore
            if created:
                count += 1

        logger.info(
            f"All sessions revoked: {count} tokens blacklisted",
            extra={'user_id': request.user.id},
        )

        return Response({
            'message': f'{count} active sessions revoked. Logged out of all devices.',
        })


# ─────────────────────────────────────────────
# ADMIN — USER MANAGEMENT
# ─────────────────────────────────────────────

class UserListView(generics.ListAPIView):
    """GET a list of all team members. (Admin Only)"""
    queryset = User.objects.select_related('currency_preference').all().order_by('-date_joined')
    serializer_class = AdminUserManagementSerializer
    permission_classes = [IsSmartMoveAdmin]


class UserDetailUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET:    Retrieve a specific user's profile. (Admin Only)
    PATCH:  Update a user's role, region, is_active, name. (Admin Only)
    DELETE: Permanently delete a user account. (Admin Only)
    """
    queryset = User.objects.select_related('currency_preference').all()
    serializer_class = AdminUserManagementSerializer
    permission_classes = [IsSmartMoveAdmin]

    def perform_destroy(self, instance):
        logger.warning(
            f"Admin deleted user {instance.email} (id={instance.id})",
            extra={
                'admin_id': self.request.user.id,
                'deleted_user_id': instance.id,
                'deleted_email': instance.email,
            },
        )
        instance.delete()