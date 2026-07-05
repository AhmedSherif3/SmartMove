#!/bin/bash

echo "Updating ConfigMap..."
sudo k3s kubectl apply -f ~/k8s-gitops/02-smartmove-app/configmap.yaml

echo "Restarting backend to apply new Allowed Hosts..."
sudo k3s kubectl rollout restart deployment backend -n smartmove-prod

echo "Done!"
