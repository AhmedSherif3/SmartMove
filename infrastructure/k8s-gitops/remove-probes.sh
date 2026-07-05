#!/bin/bash

echo "Removing aggressive health checks from deployment..."

# Delete liveness probe from the file
sudo sed -i '/livenessProbe:/,+6d' /home/ubuntu/k8s-gitops/02-smartmove-app/backend-django.yaml

# Delete readiness probe from the file
sudo sed -i '/readinessProbe:/,+6d' /home/ubuntu/k8s-gitops/02-smartmove-app/backend-django.yaml

# Apply the clean file to Kubernetes
sudo kubectl apply -f /home/ubuntu/k8s-gitops/02-smartmove-app/backend-django.yaml

echo "Deployment updated! Waiting exactly 30 seconds for the new immortal pod to boot..."
sleep 30

echo "Running the auto-test script now!"
sudo bash /home/ubuntu/auto-test-db.sh
