from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class CustomUserManager(BaseUserManager):
    """Required so Django knows how to create users/admins using ONLY an email."""
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', self.model.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    # --- YOUR CHOICES (Perfectly structured) ---
    class Role(models.TextChoices):
        ADMIN        = 'ADMIN',        'Admin'
        DATA_ANALYST = 'DATA_ANALYST', 'Data Analyst'
        USER         = 'USER',         'User'

    class Region(models.TextChoices):
        EGYPT   = 'egypt',   'Egypt'
        DUBAI   = 'dubai',   'Dubai'
        ENGLAND = 'england', 'England'

    class AuthProvider(models.TextChoices):
        EMAIL     = 'email',     'Email'
        GOOGLE    = 'google',    'Google'
        MICROSOFT = 'microsoft', 'Microsoft'

    # --- CORE IDENTITY ---
    username = None  # CRITICAL: Deletes the default Django username
    email = models.EmailField(unique=True)
    
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    region = models.CharField(max_length=10, choices=Region.choices, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    auth_provider = models.CharField(max_length=10, choices=AuthProvider.choices, default=AuthProvider.EMAIL)
    profile_photo_url = models.URLField(max_length=500, blank=True, null=True)
    currency_preference = models.ForeignKey(
        'currency.CurrencyRate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="The user's preferred fiat currency for dashboard and chatbot conversions."
    )

    # --- ENTERPRISE SECURITY & AUDIT FIELDS ---
    failed_login_attempts = models.IntegerField(default=0)
    account_locked_until = models.DateTimeField(blank=True, null=True)
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)

    # --- DJANGO CONFIGURATION ---
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # CRITICAL: Must be empty since we removed username

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"
        
    @property
    def profile_completion(self):
        """Calculates profile completion percentage for the frontend UI."""
        fields = [self.first_name, self.last_name, self.region, self.profile_photo_url]
        filled = sum(1 for field in fields if field)
        return int((filled / len(fields)) * 100)


class AuditLog(models.Model):
    """Tracks every login attempt and security event."""
    objects = models.Manager()
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} at {self.timestamp}"