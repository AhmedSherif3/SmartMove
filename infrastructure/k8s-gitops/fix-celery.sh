#!/bin/bash

echo "Updating Celery Workers memory limit..."
sudo k3s kubectl apply -f ~/k8s-gitops/02-smartmove-app/celery-workers.yaml

echo "Cleaning up old junk replicasets..."
sudo k3s kubectl delete rs -l app=celery-worker -n smartmove-prod
sudo k3s kubectl delete rs -l app=backend -n smartmove-prod

echo "Done! Kubernetes will spin up exactly 2 of each right now."
