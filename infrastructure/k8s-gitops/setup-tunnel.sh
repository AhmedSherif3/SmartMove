#!/bin/bash

# Create the tunnel
echo "Creating Cloudflare Tunnel..."
cloudflared tunnel create smartmove-tunnel

# Get the UUID of the newly created tunnel
TUNNEL_UUID=$(cloudflared tunnel list | grep smartmove-tunnel | awk '{print $1}')
echo "Tunnel UUID: $TUNNEL_UUID"

# Create the config.yml file
echo "Creating config.yml..."
cat <<EOF > ~/.cloudflared/config.yml
tunnel: $TUNNEL_UUID
credentials-file: /home/ubuntu/.cloudflared/$TUNNEL_UUID.json

ingress:
  - service: http://localhost:80
EOF

# Route the DNS records to the tunnel
echo "Routing DNS records..."
cloudflared tunnel route dns smartmove-tunnel england.airflow.smartmove.me
cloudflared tunnel route dns smartmove-tunnel egypt.airflow.smartmove.me
cloudflared tunnel route dns smartmove-tunnel dubai.airflow.smartmove.me
cloudflared tunnel route dns smartmove-tunnel api.smartmove.me
cloudflared tunnel route dns smartmove-tunnel smartmove.me

# Run the tunnel as a service
echo "Installing and starting the tunnel service..."
sudo cloudflared service install /home/ubuntu/.cloudflared/$TUNNEL_UUID.json
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

echo "Tunnel setup complete!"