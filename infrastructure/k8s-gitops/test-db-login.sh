#!/bin/bash

# Find the active celery pod instead of backend (to avoid memory limits!)
POD_NAME=$(sudo kubectl get pods -n smartmove-prod -l app=celery-worker -o jsonpath="{.items[0].metadata.name}")

if [ -z "$POD_NAME" ]; then
    echo "❌ ERROR: Could not find any running celery pods."
    exit 1
fi

echo "Found lightweight celery pod: $POD_NAME"
echo "Executing Python database test script inside the pod..."

# Run the python script inside the pod
sudo kubectl exec -it $POD_NAME -n smartmove-prod -- python manage.py shell -c "
import sys
from django.db import connection
from django.contrib.auth import get_user_model

try:
    print('Testing connection to PostgreSQL on Server 2 (100.111.232.64)...')
    connection.ensure_connection()
    print('✅ Database connection successful!')
    
    User = get_user_model()
    email = 'testlogin@smartmove.com'
    password = 'TestPassword2026!'
    
    if not User.objects.filter(email=email).exists():
        print(f'Creating test user: {email}')
        User.objects.create_user(
            email=email, 
            password=password, 
            first_name='Test', 
            last_name='Login', 
            region='Egypt',
            is_active=True
        )
        print('✅ Test user created successfully!')
    else:
        print(f'✅ Test user {email} already exists!')
        
    print(f'\n--- READY FOR LOGIN TEST ---')
    print(f'Email: {email}')
    print(f'Password: {password}')
    
except Exception as e:
    print(f'\n❌ DATABASE ERROR: {str(e)}')
    sys.exit(1)
"
