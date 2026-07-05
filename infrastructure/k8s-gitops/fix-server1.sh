#!/bin/bash

echo "========================================="
echo "  Fix Server 1: Patch ConfigMap + Restart"
echo "========================================="

# Step 1: Patch the configmap with the CORRECT Tailscale IP
echo "[Step 1] Patching configmap with correct IP (100.111.232.64)..."
sudo kubectl patch configmap smartmove-config -n smartmove-prod --type=merge -p '{"data":{"DB_HOST":"100.111.232.64","REDIS_HOST":"100.111.232.64"}}'

# Step 2: Restart celery workers so they pick up the new IP
echo "[Step 2] Restarting celery workers with new IP..."
sudo kubectl rollout restart deployment celery-worker -n smartmove-prod

# Step 3: Scale backend to 1 and restart it too
echo "[Step 3] Restarting backend (1 replica only)..."
sudo kubectl scale deployment backend -n smartmove-prod --replicas=1
sudo kubectl rollout restart deployment backend -n smartmove-prod

echo ""
echo "✅ All deployments patched and restarting!"
echo "⏳ Waiting 45 seconds for pods to boot with new config..."
sleep 45

# Step 4: Show pod status
echo ""
echo "[Step 4] Current pod status:"
sudo kubectl get pods -n smartmove-prod
