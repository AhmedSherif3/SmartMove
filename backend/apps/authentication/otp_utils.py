import random
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from .models import OTP


def generate_otp(user, purpose):
    # Invalidate existing unused OTPs for same purpose
    OTP.objects.filter(
        user=user,
        purpose=purpose,
        is_used=False
    ).delete()

    code = str(random.randint(100000, 999999))

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