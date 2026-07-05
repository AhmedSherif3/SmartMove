from django.conf import settings
from django.db import models


class OTP(models.Model):
    objects = models.Manager()

    class Purpose(models.TextChoices):
        VERIFY_EMAIL      = 'verify_email',      'Verify Email'
        RESET_PASSWORD    = 'reset_password',    'Reset Password'
        CHANGE_PASSWORD   = 'change_password',   'Change Password'
        CHANGE_EMAIL      = 'change_email',      'Change Email'

    user       = models.ForeignKey(
                     settings.AUTH_USER_MODEL,
                     on_delete=models.CASCADE,
                     related_name='otps'
                 )
    code       = models.CharField(max_length=6)
    purpose    = models.CharField(
                     max_length=20,
                     choices=Purpose.choices
                 )
    is_used    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.user.email} - {self.purpose} - {self.code}"  # type: ignore