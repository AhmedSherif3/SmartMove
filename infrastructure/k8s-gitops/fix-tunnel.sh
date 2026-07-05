#!/bin/bash

# Get the UUID of the existing tunnel
TUNNEL_UUID=$(cloudflared tunnel list | grep smartmove-tunnel | awk '{print $1}')
if [ -z "$TUNNEL_UUID" ]; then
  echo "Error: Could not find smartmove-tunnel"
  exit 1
fi

# Ignore the old weird subdomains, they won't hurt anything.
# Let's create the CORRECT DNS routes pointing to the root domain:
echo "Creating correct DNS routes for smartmoveanalytics.me..."
cloudflared tunnel route dns smartmove-tunnel england.airflow.smartmoveanalytics.me
cloudflared tunnel route dns smartmove-tunnel egypt.airflow.smartmoveanalytics.me
cloudflared tunnel route dns smartmove-tunnel dubai.airflow.smartmoveanalytics.me
cloudflared tunnel route dns smartmove-tunnel api.smartmoveanalytics.me
cloudflared tunnel route dns smartmove-tunnel smartmoveanalytics.me

echo "Applying updated Kubernetes Ingress rules with correct domains..."
sudo k3s kubectl apply -f ~/k8s-gitops/04-admin-pipeline/routing-ingress.yaml
sudo k3s kubectl apply -f ~/k8s-gitops/02-smartmove-app/routing-ingress.yaml

echo "Fixing service installation (running as root)..."
sudo mkdir -p /etc/cloudflared
sudo cp /home/ubuntu/.cloudflared/$TUNNEL_UUID.json /etc/cloudflared/

cat <<EOF | sudo tee /etc/cloudflared/config.yml
tunnel: $TUNNEL_UUID
credentials-file: /etc/cloudflared/$TUNNEL_UUID.json

ingress:
  - service: http://localhost:80
EOF

echo "Starting the service..."
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

echo "Tunnel setup is completely fixed and running!"