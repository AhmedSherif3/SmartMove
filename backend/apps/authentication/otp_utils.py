import secrets
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from .models import OTP


def generate_otp(user, purpose):
    """Generate a cryptographically-secure 6-digit OTP, invalidating all previous ones."""
    # Wipe ALL previous OTPs for this user+purpose (used or unused) for a clean slate
    OTP.objects.filter(user=user, purpose=purpose).delete()

    # Use secrets module for cryptographically secure random number
    code = str(secrets.randbelow(900000) + 100000)

    otp = OTP.objects.create(
        user=user,
        code=code,
        purpose=purpose,
        expires_at=timezone.now() + timedelta(
            minutes=getattr(settings, 'OTP_EXPIRY_MINUTES', 10)
        )
    )
    return otp


def verify_otp(user, code, purpose):
    """
    Verify and immediately CONSUME (delete) a valid OTP.
    Used for single-step verifications: email verify, change-password.
    """
    try:
        otp = OTP.objects.get(
            user=user,
            code=code,
            purpose=purpose,
            is_used=False,
            expires_at__gt=timezone.now()
        )
        otp.delete()
        return True, None
    except ObjectDoesNotExist:
        return False, "Invalid or expired OTP"


def verify_otp_mark_used(user, code, purpose):
    """
    Verify a valid OTP and mark it as used WITHOUT deleting it.
    Used for multi-step flows (forgot-password) where the same code
    must be referenced again in the following step (ResetPasswordView).
    """
    try:
        otp = OTP.objects.get(
            user=user,
            code=code,
            purpose=purpose,
            is_used=False,
            expires_at__gt=timezone.now()
        )
        otp.is_used = True
        otp.save(update_fields=['is_used'])
        return True, None
    except ObjectDoesNotExist:
        return False, "Invalid or expired OTP"


def consume_verified_otp(user, code, purpose):
    """
    Consume a previously-verified (is_used=True) OTP that matches the code.
    Used as the final security gate in ResetPasswordView after VerifyForgotOTPView
    has already validated and marked the OTP.
    The code must still match so no other party can complete the reset.
    """
    try:
        otp = OTP.objects.get(
            user=user,
            code=code,
            purpose=purpose,
            is_used=True,
            expires_at__gt=timezone.now()
        )
        otp.delete()
        return True, None
    except ObjectDoesNotExist:
        return False, "OTP session expired or not verified. Please restart the password reset flow."