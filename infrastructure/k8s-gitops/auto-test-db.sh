#!/bin/bash

echo "Watching backend pod status..."

while true; do
  STATUS=$(sudo kubectl get pods -n smartmove-prod -l app=backend -o jsonpath="{.items[0].status.phase}" 2>/dev/null)
  
  if [ "$STATUS" == "Running" ]; then
    echo "🚀 Pod is now Running! Executing database test immediately..."
    sudo bash /home/ubuntu/k8s-gitops/test-db-login.sh
    break
  else
    echo "Waiting for pod to leave Pending state... (Current: $STATUS)"
    sleep 2
  fi
done
