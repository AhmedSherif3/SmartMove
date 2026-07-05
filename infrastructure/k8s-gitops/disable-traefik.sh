#!/bin/bash

echo "Disabling Traefik..."
sudo mkdir -p /etc/rancher/k3s
cat <<EOF | sudo tee -a /etc/rancher/k3s/config.yaml
disable:
  - traefik
EOF

echo "Restarting K3s to apply changes..."
sudo systemctl restart k3s

echo "Removing the old Traefik resources..."
sudo k3s kubectl delete deploy traefik -n kube-system --ignore-not-found
sudo k3s kubectl delete svc traefik -n kube-system --ignore-not-found
sudo k3s kubectl delete helmchart traefik -n kube-system --ignore-not-found
sudo k3s kubectl delete helmchart traefik-crd -n kube-system --ignore-not-found

echo "Wait a few seconds for NGINX to bind to port 80..."
sleep 10
echo "Done! NGINX should now be handling your traffic."