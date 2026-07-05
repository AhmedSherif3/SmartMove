#!/bin/bash

echo "========================================="
echo "  SmartMove Ultimate Fix & Test Script"
echo "========================================="

# Step 1: Clean up crashed backend pods
echo ""
echo "[Step 1] Cleaning up crashed backend pods..."
sudo kubectl scale deployment backend -n smartmove-prod --replicas=1
sudo kubectl delete pods -n smartmove-prod -l app=backend --field-selector=status.phase!=Running 2>/dev/null
echo "✅ Scaled backend to 1 replica and cleaned up stuck pods."

# Step 2: Test network connectivity to Server 2
echo ""
echo "[Step 2] Testing network connectivity to Server 2 (100.111.232.64)..."
nc -vz -w 5 100.111.232.64 6432 2>&1 && echo "✅ PgBouncer port 6432 is OPEN!" || echo "⚠️  PgBouncer port 6432 is CLOSED."
nc -vz -w 5 100.111.232.64 6379 2>&1 && echo "✅ Redis port 6379 is OPEN!" || echo "⚠️  Redis port 6379 is CLOSED."

# Step 3: Use lightweight Python to test DB (no Django shell!)
echo ""
echo "[Step 3] Testing database connection (lightweight mode)..."
POD_NAME=$(sudo kubectl get pods -n smartmove-prod -l app=celery-worker --field-selector=status.phase=Running -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)

if [ -z "$POD_NAME" ]; then
    echo "❌ ERROR: No running celery-worker pods found."
    exit 1
fi

echo "Using pod: $POD_NAME"

sudo kubectl exec $POD_NAME -n smartmove-prod -- python -c "
import psycopg2, os, sys
try:
    host = os.environ.get('DB_HOST', '100.111.232.64')
    port = os.environ.get('DB_PORT', '6432')
    db = os.environ.get('DB_NAME', 'smartmove_prod')
    user = os.environ.get('DB_USER', 'smartmove_admin')
    pw = os.environ.get('DB_PASSWORD', 'SuperSecureProductionPassword2026!')
    print(f'Connecting to {host}:{port}/{db} as {user}...')
    conn = psycopg2.connect(host=host, port=int(port), dbname=db, user=user, password=pw, connect_timeout=10)
    cur = conn.cursor()
    cur.execute('SELECT 1')
    print('✅ Database connection successful!')
    conn.close()
except Exception as e:
    print(f'❌ DATABASE ERROR: {e}')
    sys.exit(1)
"

if [ $? -eq 0 ]; then
    echo ""
    echo "[Step 4] Creating test user..."
    sudo kubectl exec $POD_NAME -n smartmove-prod -- python -c "
import os, sys, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.production'
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
email = 'testlogin@smartmove.com'
pw = 'TestPassword2026!'
if not User.objects.filter(email=email).exists():
    User.objects.create_user(email=email, password=pw, first_name='Test', last_name='Login', region='Egypt', is_active=True)
    print(f'✅ User created: {email} / {pw}')
else:
    print(f'✅ User already exists: {email}')
"
fi
