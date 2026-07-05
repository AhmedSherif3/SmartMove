from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.conf import settings
from apps.currency.models import CurrencyRate

User = get_user_model()


class CurrencyRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurrencyRate
        fields = ['currency_code', 'rate_to_usd', 'last_updated']


class UserProfileSerializer(serializers.ModelSerializer):
    """Used for the /me/ endpoint. Prevents users from editing their role."""
    profile_completion = serializers.ReadOnlyField()
    chatbot_queries_limit = serializers.SerializerMethodField()
    
    currency_preference = CurrencyRateSerializer(read_only=True)
    currency_preference_id = serializers.PrimaryKeyRelatedField(
        queryset=CurrencyRate.objects.all(),
        source='currency_preference',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 
            'region', 'currency_preference', 'currency_preference_id', 'profile_photo_url', 'is_active', 
            'is_verified', 'auth_provider', 'date_joined',
            'last_login', 'last_login_ip',
            'profile_completion', 'chatbot_queries_limit'
        ]
        read_only_fields = [
            'id', 'email', 'role', 'is_active',
            'is_verified', 'auth_provider', 'date_joined',
            'last_login', 'last_login_ip',
        ]

    def get_chatbot_queries_limit(self, obj):
        # Grabs the limit from settings (so it isn't hardcoded)
        return getattr(settings, 'CHATBOT_DAILY_LIMIT', 5)


class AdminUserManagementSerializer(serializers.ModelSerializer):
    """Used by the Admin to view all users and change roles/status."""
    currency_preference = CurrencyRateSerializer(read_only=True)
    currency_preference_id = serializers.PrimaryKeyRelatedField(
        queryset=CurrencyRate.objects.all(),
        source='currency_preference',
        write_only=True,
        required=False,
        allow_null=True
    )
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role',
            'region', 'currency_preference', 'currency_preference_id', 'is_active', 'last_login', 'last_login_ip'
        ]
        read_only_fields = ['id', 'email', 'last_login', 'last_login_ip']


class ProfilePhotoSerializer(serializers.Serializer):
    """Validates the uploaded profile photo file."""
    photo = serializers.ImageField(
        help_text='Profile photo image file (JPEG, PNG, WebP).'
    )

    def validate_photo(self, value):
        # Limit file size to 5 MB
        max_size = 5 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                'Image file too large. Maximum size is 5 MB.'
            )

        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f'Unsupported image type: {value.content_type}. '
                f'Allowed: {", ".join(allowed_types)}'
            )
        return value


class RequestEmailChangeSerializer(serializers.Serializer):
    """Validates the new email for the email-change request."""
    new_email = serializers.EmailField()

    def validate_new_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'This email address is already in use.'
            )
        return value


class VerifyEmailChangeSerializer(serializers.Serializer):
    """Validates the OTP and new email for the email-change verification."""
    new_email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)