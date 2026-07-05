import os
import django
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.subscriptions.models import CustomerProfile, Subscription

User = get_user_model()

# 1. Create Data Analyst User
analyst_email = 'ahmedsherif3315@gmail.com'
analyst_password = 'ahmedsh'

try:
    analyst_user = User.objects.get(email=analyst_email)
    print(f"User {analyst_email} already exists.")
    analyst_user.set_password(analyst_password)
    analyst_user.role = User.Role.DATA_ANALYST
    analyst_user.save()
except User.DoesNotExist:
    analyst_user = User.objects.create_user(
        email=analyst_email,
        password=analyst_password,
        role=User.Role.DATA_ANALYST,
        is_verified=True
    )
    print(f"Created user {analyst_email}")

# Update CustomerProfile
profile, _ = CustomerProfile.objects.get_or_create(user=analyst_user)
profile.role = 'data_analyst'
profile.save()

# Subscribe to Ultimate Bundle
sub, created = Subscription.objects.get_or_create(
    user=analyst_user,
    plan_type='premium_bundle',
    defaults={
        'stripe_subscription_id': 'sub_manual_premium_bundle_123',
        'stripe_price_id': 'price_manual',
        'status': 'active',
        'current_period_end': timezone.now() + timedelta(days=365)
    }
)
if created:
    print(f"Subscribed {analyst_email} to premium_bundle")
else:
    # Ensure it's active
    sub.status = 'active'
    sub.save()
    print(f"Updated {analyst_email} subscription to active")

# 2. Create Admin User
admin_email = 'noreply.smartmove@gmail.com'
admin_password = 'smartmove'

try:
    admin_user = User.objects.get(email=admin_email)
    print(f"Admin {admin_email} already exists.")
    admin_user.set_password(admin_password)
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.role = User.Role.ADMIN
    admin_user.save()
except User.DoesNotExist:
    admin_user = User.objects.create_superuser(
        email=admin_email,
        password=admin_password
    )
    print(f"Created admin {admin_email}")

print("Script completed.")
