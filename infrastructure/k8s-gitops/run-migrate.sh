#!/bin/bash

echo "========================================="
echo "  Run Django Migrations (Dedicated Pod)"
echo "========================================="

# Step 1: Free up resources by scaling down
echo "[Step 1] Freeing up cluster resources..."
sudo kubectl scale deployment celery-worker -n smartmove-prod --replicas=1
sudo kubectl scale deployment frontend -n smartmove-prod --replicas=1
sudo kubectl scale deployment backend -n smartmove-prod --replicas=0
sleep 5

# Step 2: Delete any previous migration job
echo "[Step 2] Cleaning up old migration jobs..."
sudo kubectl delete job django-migrate -n smartmove-prod 2>/dev/null

# Step 3: Apply the migration job
echo "[Step 3] Starting migration job with 2Gi memory..."
sudo kubectl apply -f /home/ubuntu/k8s-gitops/migrate-job.yaml

# Step 4: Wait for the job to complete
echo "[Step 4] Waiting for migrations to finish (this may take 1-2 minutes)..."
sudo kubectl wait --for=condition=complete job/django-migrate -n smartmove-prod --timeout=300s 2>/dev/null

# Step 5: Show migration logs
echo ""
echo "Migration output:"
sudo kubectl logs job/django-migrate -n smartmove-prod

# Step 6: Restore deployments
echo ""
echo "[Step 5] Restoring deployments..."
sudo kubectl scale deployment celery-worker -n smartmove-prod --replicas=2
sudo kubectl scale deployment frontend -n smartmove-prod --replicas=2
sudo kubectl scale deployment backend -n smartmove-prod --replicas=1

echo ""
echo "✅ Done! Now run: sudo bash /home/ubuntu/ultimate-fix.sh"
