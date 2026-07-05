from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

VALID_REGIONS = ['egypt', 'dubai', 'england']


class RegisterSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(
                           write_only=True, min_length=8
                       )
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = [
            'email', 'password', 'confirm_password',
            'first_name', 'last_name', 'region'
        ]

    def validate_region(self, value):
        if value not in VALID_REGIONS:
            raise serializers.ValidationError(
                f'Region must be one of: {", ".join(VALID_REGIONS)}'
            )
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError(
                {'confirm_password': 'Passwords do not match'}
            )
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            role=User.Role.USER,
            is_verified=False,
            auth_provider='email',
            **validated_data
        )
        return user


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'role', 'region', 'is_verified',
            'auth_provider', 'date_joined', 'last_login'
        ]
        read_only_fields = [
            'id', 'role', 'is_verified',
            'auth_provider', 'date_joined', 'last_login'
        ]


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)


class ResendOTPSerializer(serializers.Serializer):
    email   = serializers.EmailField()
    purpose = serializers.ChoiceField(
                  choices=[
                      'verify_email',
                      'reset_password',
                      'change_password',
                      'change_email',
                  ]
              )


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyForgotOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code  = serializers.CharField(max_length=6)


class ResetPasswordSerializer(serializers.Serializer):
    email            = serializers.EmailField()
    code             = serializers.CharField(max_length=6)
    new_password     = serializers.CharField(
                           min_length=8, write_only=True
                       )
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError(
                {'confirm_password': 'Passwords do not match'}
            )
        return data


class ChangePasswordRequestSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)


class ChangePasswordVerifySerializer(serializers.Serializer):
    code             = serializers.CharField(max_length=6)
    new_password     = serializers.CharField(
                           min_length=8, write_only=True
                       )
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError(
                {'confirm_password': 'Passwords do not match'}
            )
        return data


class UpdateRegionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['region']

    def validate_region(self, value):
        if value not in VALID_REGIONS:
            raise serializers.ValidationError(
                f'Region must be one of: {", ".join(VALID_REGIONS)}'
            )
        return value


class UpdateUserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['role']

    def validate_role(self, value):
        if value not in User.Role.values:
            raise serializers.ValidationError(
                f'Invalid role. Must be one of: {", ".join(User.Role.values)}'
            )
        return value


class SocialAuthRegionSerializer(serializers.Serializer):
    region = serializers.ChoiceField(choices=VALID_REGIONS)