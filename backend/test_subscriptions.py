import os
import django
import json
from datetime import datetime, timezone
import sys
from typing import Any

# Ensure django can load
sys.path.append('d:/Main/SmartMove/Repo/SmartMove/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

import django.conf
# Setup standalone django test environment
django.conf.settings.configure(
    DEBUG=True,
    DATABASES={'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}},
    AUTH_USER_MODEL='users.User',
    INSTALLED_APPS=[
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'apps.users',
        'apps.currency',
        'apps.subscriptions',
    ],
    LEMON_SQUEEZY_API_KEY='test_api_key',
    LEMON_SQUEEZY_STORE_ID='12345',
    LEMON_SQUEEZY_WEBHOOK_SECRET='test_wh_secret',
    FRONTEND_URL='http://localhost:3000',
    ROOT_URLCONF='apps.subscriptions.urls',
    AIRFLOW_WEBHOOK_SECRET='test_secret',
    LEMON_SQUEEZY_PLAN_MAP={
        'analyst':             {'variant_id': 'var_analyst',      'plan_type': 'analyst',             'category': 'role'},
        'analyst_pro_max':     {'variant_id': 'var_pro_max',      'plan_type': 'analyst_pro_max',     'category': 'role'},
        'storage_per_gb':      {'variant_id': 'var_storage_gb',   'plan_type': 'storage_per_gb',      'category': 'storage'},
        'storage_5gb':         {'variant_id': 'var_storage_5gb',  'plan_type': 'storage_5gb',         'category': 'storage'},
        'storage_9gb':         {'variant_id': 'var_storage_9gb',  'plan_type': 'storage_9gb',         'category': 'storage'},
        'report_single':       {'variant_id': 'var_single_rep',   'plan_type': 'report_single',       'category': 'reports'},
        'report_all':          {'variant_id': 'var_all_rep',      'plan_type': 'report_all',          'category': 'reports'},
    }
)
django.setup()
from django.core.management import call_command
call_command('migrate', interactive=False, verbosity=0)

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.subscriptions.models import CustomerProfile, Subscription
from unittest.mock import patch, MagicMock
from django.db import IntegrityError
import hmac
import hashlib

User = get_user_model()

# Setup test users
user_free, _ = User.objects.get_or_create(email="free_user@example.com", defaults={"password": "password"})
user_premium, _ = User.objects.get_or_create(email="premium_user@example.com", defaults={"password": "password"})
user_reports, _ = User.objects.get_or_create(email="reports_user@example.com", defaults={"password": "password"})

CustomerProfile.objects.update_or_create(user=user_free, defaults={"role": "user"})
CustomerProfile.objects.update_or_create(user=user_premium, defaults={"role": "data_analyst", "ls_customer_id": "cus_123"})
CustomerProfile.objects.update_or_create(user=user_reports, defaults={"role": "user", "ls_customer_id": "cus_456"})

# Analyst plan
Subscription.objects.update_or_create(user=user_premium, plan_type="analyst", status="active", defaults={
    "ls_subscription_id": "sub_analyst_123",
    "ls_variant_id": "var_analyst",
    "current_period_end": datetime(2027, 1, 1, tzinfo=timezone.utc)
})

# Single region egypt report
Subscription.objects.update_or_create(user=user_reports, plan_type="report_single_egypt", status="active", defaults={
    "ls_subscription_id": "sub_egypt_123",
    "ls_variant_id": "var_single_rep",
    "current_period_end": datetime(2027, 1, 1, tzinfo=timezone.utc)
})
# Single region dubai report
Subscription.objects.update_or_create(user=user_reports, plan_type="report_single_dubai", status="active", defaults={
    "ls_subscription_id": "sub_dubai_123",
    "ls_variant_id": "var_single_rep",
    "current_period_end": datetime(2027, 1, 1, tzinfo=timezone.utc)
})

client = APIClient()

print("--------------------------------------------------------")
print("TESTING OVERHAULED LEMON SQUEEZY SUBSCRIPTION SYSTEM")
print("--------------------------------------------------------")

print("\n--- 1. GET /plans/ (AllowAny) ---")
resp: Any = client.get('/plans/')
print(f"Response Code: {resp.status_code}")
print(f"Plans returned: {len(resp.json())}")

print("\n--- 2. Multi-category Coexistence ---")
with patch('apps.subscriptions.services.requests.post') as mock_post:
    mock_response = MagicMock()
    mock_response.json.return_value = {"data": {"attributes": {"url": "https://checkout.lemonsqueezy.com/checkout/123"}}}
    mock_post.return_value = mock_response
    
    # user_premium has analyst (role). They try to buy report_single for england
    client.force_authenticate(user=user_premium)
    resp: Any = client.post('/checkout/', data={"plan": "report_single", "region": "england"}, format='json')
    print(f"Response Code (Cross-category checkout): {resp.status_code}")
    print(f"Checkout URL: {resp.json().get('checkout_url')}")

print("\n--- 3. Immediate Upgrade Path (Analyst -> Pro Max) ---")
with patch('apps.subscriptions.services.requests.patch') as mock_patch:
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_patch.return_value = mock_response
    
    # user_premium upgrades to analyst_pro_max
    client.force_authenticate(user=user_premium)
    resp: Any = client.post('/checkout/', data={"plan": "analyst_pro_max"}, format='json')
    print(f"Response Code: {resp.status_code}")
    print(f"Response Body: {resp.content.decode()}")
    
    # Check DB
    sub = Subscription.objects.get(user=user_premium, plan_type='analyst_pro_max')
    print(f"Subscription plan updated in-place: {sub.plan_type}")
    prof = CustomerProfile.objects.get(user=user_premium)
    print(f"Profile role: {prof.role}")
    print(f"User role: {user_premium.role}")

print("\n--- 4. Bundle Consolidation - Happy Path ---")
with patch('apps.subscriptions.services.requests.delete') as mock_del, patch('apps.subscriptions.services.requests.post') as mock_post:
    mock_response = MagicMock()
    mock_response.json.return_value = {"data": {"attributes": {"url": "https://checkout.lemonsqueezy.com/checkout/bundle"}}}
    mock_post.return_value = mock_response
    mock_del.return_value.status_code = 200
    
    # user_reports has egypt and dubai. Buying report_all
    client.force_authenticate(user=user_reports)
    resp: Any = client.post('/checkout/', data={"plan": "report_all"}, format='json')
    print(f"Response Code: {resp.status_code}")
    
    # Check if individual subs are canceled
    canceled_subs = Subscription.objects.filter(user=user_reports, plan_type__startswith='report_single_', status='canceled')
    print(f"Number of canceled individual subs: {canceled_subs.count()}")

print("\n--- 5. Bundle Consolidation - Already Subscribed ---")
# Manually set user to report_all
Subscription.objects.update_or_create(user=user_reports, plan_type="report_all", status="active", defaults={
    "ls_subscription_id": "sub_all_123",
    "ls_variant_id": "var_all_rep",
    "current_period_end": datetime(2027, 1, 1, tzinfo=timezone.utc)
})
client.force_authenticate(user=user_reports)
resp: Any = client.post('/checkout/', data={"plan": "report_all"}, format='json')
print(f"Response Code: {resp.status_code} (Expected 400)")

print("\n--- 6. Bundle Consolidation - Failure Path ---")
user_fail, _ = User.objects.get_or_create(email="fail_user@example.com")
Subscription.objects.update_or_create(user=user_fail, plan_type="report_single_egypt", status="active", defaults={
    "ls_subscription_id": "sub_fail_123",
    "ls_variant_id": "var_single_rep",
    "current_period_end": datetime(2027, 1, 1, tzinfo=timezone.utc)
})
client.force_authenticate(user=user_fail)

with patch('apps.subscriptions.services.requests.delete') as mock_del:
    mock_del.side_effect = Exception("Lemon Squeezy Network Error")
    resp: Any = client.post('/checkout/', data={"plan": "report_all"}, format='json')
    print(f"Response Code: {resp.status_code} (Expected 502)")
    # Should remain active
    sub = Subscription.objects.get(user=user_fail, plan_type='report_single_egypt')
    print(f"Subscription status remained: {sub.status}")

print("\n--- 7. Webhook Provisioning (subscription_created for Analyst) ---")
def get_signature(payload_bytes, secret):
    return hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()

payload = {
    'meta': {
        'event_name': 'subscription_created',
        'custom_data': {
            'django_user_id': str(user_free.id),
            'plan_type': 'analyst'
        }
    },
    'data': {
        'id': 'sub_webhook_123',
        'attributes': {
            'variant_id': 'var_analyst',
            'status': 'active',
            'customer_id': 'cus_free_123',
            'renews_at': '2027-01-01T00:00:00.000000Z'
        }
    }
}
payload_bytes = json.dumps(payload).encode('utf-8')
signature = get_signature(payload_bytes, 'test_wh_secret')

resp: Any = client.post('/webhook/', data=payload_bytes, content_type='application/json', HTTP_X_SIGNATURE=signature)
print(f"Webhook Call Code: {resp.status_code}")

# Check user role and storage in DB
user_free.refresh_from_db()
profile = CustomerProfile.objects.get(user=user_free)
print(f"Upgraded User Role: {user_free.role} (Expected DATA_ANALYST)")
print(f"Upgraded Profile Role: {profile.role} (Expected data_analyst)")
print(f"Total Storage: {profile.get_total_storage_allowance()} GB (Expected 5 GB)")

print("\n--- 8. Webhook Provisioning (subscription_created for Storage Per GB quantity=3) ---")
payload_storage = {
    'meta': {
        'event_name': 'subscription_created',
        'custom_data': {
            'django_user_id': str(user_free.id),
            'plan_type': 'storage_per_gb'
        }
    },
    'data': {
        'id': 'sub_webhook_storage',
        'attributes': {
            'variant_id': 'var_storage_gb',
            'status': 'active',
            'quantity': 3,
            'renews_at': '2027-01-01T00:00:00.000000Z'
        }
    }
}
payload_storage_bytes = json.dumps(payload_storage).encode('utf-8')
signature_storage = get_signature(payload_storage_bytes, 'test_wh_secret')

resp: Any = client.post('/webhook/', data=payload_storage_bytes, content_type='application/json', HTTP_X_SIGNATURE=signature_storage)
print(f"Webhook Storage Call Code: {resp.status_code}")

profile.refresh_from_db()
print(f"New Total Storage Allowance: {profile.get_total_storage_allowance()} GB (Expected 5 base + 3 extra = 8 GB)")

print("\nAll tests completed.")
