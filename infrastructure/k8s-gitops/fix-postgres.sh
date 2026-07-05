#!/bin/bash

echo "Fixing PostgreSQL configuration to allow external Tailscale connections..."

# 1. Force Postgres to listen on all interfaces instead of just localhost
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf
sudo sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf

# 2. Whitelist Tailscale networks in pg_hba.conf to allow the password authentication
echo "host    all             all             100.64.0.0/10           scram-sha-256" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf > /dev/null
echo "host    all             all             100.64.0.0/10           md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf > /dev/null

# 3. Restart PostgreSQL to apply all changes
sudo systemctl restart postgresql

echo "✅ PostgreSQL is now listening on all interfaces and accepting Tailscale traffic!"
