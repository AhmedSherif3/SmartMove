import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# 1. Analyst Account
try:
    analyst, _ = User.objects.get_or_create(email='george.milad2@gmail.com')
    analyst.set_password('George12@')
    analyst.is_active = True
    
    # Try setting common role/verification fields if they exist
    if hasattr(analyst, 'role'):
        analyst.role = 'analyst'
    if hasattr(analyst, 'is_verified'):
        analyst.is_verified = True
        
    analyst.save()
    print("Analyst account george.milad2@gmail.com created successfully.")
except Exception as e:
    print(f"Failed to create analyst account: {e}")

# 2. Admin Account
try:
    admin_acc, _ = User.objects.get_or_create(email='admin@smartmove.app')
    admin_acc.set_password('Admin123!')
    admin_acc.is_active = True
    admin_acc.is_staff = True
    admin_acc.is_superuser = True
    
    if hasattr(admin_acc, 'role'):
        admin_acc.role = 'admin'
    if hasattr(admin_acc, 'is_verified'):
        admin_acc.is_verified = True
        
    admin_acc.save()
    print("Admin account admin@smartmove.app created successfully.")
except Exception as e:
    print(f"Failed to create admin account: {e}")
