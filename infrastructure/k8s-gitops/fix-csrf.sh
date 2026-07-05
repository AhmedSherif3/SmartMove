#!/bin/bash

echo "Applying new ConfigMap with CSRF origins..."
sudo k3s kubectl apply -f ~/k8s-gitops/02-smartmove-app/configmap.yaml

echo "Restarting backend to pull new image..."
sudo k3s kubectl rollout restart deployment backend -n smartmove-prod

echo "Done!"
