#!/bin/bash

echo "========================================="
echo "  Fix: Install pgvector extension"
echo "========================================="

cd /home/ubuntu/database-node

# Step 1: Update docker-compose to use pgvector image
echo "[Step 1] Switching Postgres image to pgvector/pgvector:pg16..."
sudo sed -i 's|image: postgres:16|image: pgvector/pgvector:pg16|g' docker-compose.yml

# Step 2: Rebuild Postgres with the new image (must delete volume for fresh init)
echo "[Step 2] Rebuilding Postgres with pgvector support..."
sudo docker compose down -v --remove-orphans
sudo docker compose up -d

echo ""
echo "⏳ Waiting 20 seconds for Postgres to initialize with pgvector..."
sleep 20

echo ""
echo "Container status:"
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" | grep -E "postgres|pgbouncer|redis"

echo ""
echo "✅ Done! Go to Server 1 and run migrations + test:"
echo "   sudo kubectl exec <celery-pod> -n smartmove-prod -- python manage.py migrate"
echo "   sudo bash /home/ubuntu/ultimate-fix.sh"
