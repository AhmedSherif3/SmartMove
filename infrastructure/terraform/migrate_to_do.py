import os

def rewrite_server(server_name, index, account_name):
    base_dir = f"d:/SmartMove/infrastructure/terraform/main-servers/{server_name}"
    
    # main.tf
    main_tf = f"""terraform {{
  required_providers {{
    digitalocean = {{
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }}
  }}
}}

provider "digitalocean" {{
  token = var.do_token
}}

resource "digitalocean_vpc" "smartmove_vpc" {{
  name     = "smartmove-vpc-{server_name}"
  region   = var.region
  ip_range = "10.0.0.0/16"
}}

resource "digitalocean_firewall" "smartmove_fw" {{
  name = "smartmove-fw-{server_name}"

  droplet_ids = [digitalocean_droplet.server.id]

  inbound_rule {{
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }}

  inbound_rule {{
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }}

  inbound_rule {{
    protocol         = "udp"
    port_range       = "41641"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }}

  outbound_rule {{
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }}
  outbound_rule {{
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }}
  outbound_rule {{
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }}
}}

resource "digitalocean_ssh_key" "smartmove_key" {{
  name       = "smartmove-key-{server_name}"
  public_key = var.ssh_public_key
}}

resource "digitalocean_droplet" "server" {{
  image    = "ubuntu-22-04-x64"
  name     = "SmartMove-{server_name}"
  region   = var.region
  size     = "g-4vcpu-16gb"
  vpc_uuid = digitalocean_vpc.smartmove_vpc.id
  ssh_keys = [digitalocean_ssh_key.smartmove_key.fingerprint]

  user_data = <<-EOF
    #!/bin/bash
    curl -fsSL https://tailscale.com/install.sh | sh
    tailscale up --authkey=${{var.tailscale_auth_key}} --ssh
  EOF
}}

resource "digitalocean_volume" "data" {{
  region                  = var.region
  name                    = "smartmove-vol-{server_name}"
  size                    = 200
  initial_filesystem_type = "ext4"
  description             = "200GB Attached Block Storage"
}}

resource "digitalocean_volume_attachment" "vol_attach" {{
  droplet_id = digitalocean_droplet.server.id
  volume_id  = digitalocean_volume.data.id
}}

output "public_ip" {{
  value = digitalocean_droplet.server.ipv4_address
}}
"""
    with open(os.path.join(base_dir, "main.tf"), "w") as f:
        f.write(main_tf)

    # variables.tf
    vars_tf = """variable "do_token" { type = string }
variable "region" { 
  type = string 
  default = "fra1" 
}
variable "ssh_public_key" { type = string }
variable "tailscale_auth_key" { type = string }
"""
    with open(os.path.join(base_dir, "variables.tf"), "w") as f:
        f.write(vars_tf)

    # secrets.tfvars
    ssh_key = "ssh-rsa AAAAB3Nza... local@local"
    if index == 1: ssh_key = "ssh-rsa AAAAB3Nza... ahmed@AhmedSherif"
    elif index == 2: ssh_key = "ssh-rsa AAAAB3Nza... george@local"
    elif index == 3: ssh_key = "ssh-rsa AAAAB3Nza... shreen@local"
    elif index == 4: ssh_key = "ssh-rsa AAAAB3Nza... teammember@local"

    secrets_tf = f"""# {account_name} DigitalOcean API Credentials
do_token           = "dop_v1_xxxxxx_account_{index}"
region             = "fra1"

# SSH Key for emergency local access
ssh_public_key     = "{ssh_key}"

# Tailscale Auth 
tailscale_auth_key = "tskey-auth-xxxxxxxxx-xxxxxxxxx"
"""
    with open(os.path.join(base_dir, "secrets.tfvars"), "w") as f:
        f.write(secrets_tf)

def rewrite_storage(server_name, bucket_name):
    base_dir = f"d:/SmartMove/infrastructure/terraform/main-servers/{server_name}"
    storage_tf = f"""resource "digitalocean_spaces_bucket" "bucket" {{
  name   = "{bucket_name}"
  region = var.region
  acl    = "private"
}}

output "s3_endpoint_url" {{
  value       = "https://${{digitalocean_spaces_bucket.bucket.region}}.digitaloceanspaces.com"
  description = "The S3-compatible endpoint for DO Spaces"
}}
"""
    with open(os.path.join(base_dir, "storage.tf"), "w") as f:
        f.write(storage_tf)

def rewrite_micro(vm_name, account_index):
    base_dir = f"d:/SmartMove/infrastructure/terraform/micro-vms/{vm_name}"
    
    # main.tf
    main_tf = f"""resource "digitalocean_ssh_key" "smartmove_key" {{
  name       = "smartmove-key-{vm_name}"
  public_key = var.ssh_public_key
}}

resource "digitalocean_droplet" "vm" {{
  image    = "ubuntu-22-04-x64"
  name     = "SmartMove-{vm_name}"
  region   = var.region
  size     = "s-1vcpu-1gb"
  ssh_keys = [digitalocean_ssh_key.smartmove_key.fingerprint]

  user_data = <<-EOF
    #!/bin/bash
    curl -fsSL https://tailscale.com/install.sh | sh
    tailscale up --authkey=${{var.tailscale_auth_key}} --ssh
  EOF
}}

output "public_ip" {{
  value = digitalocean_droplet.vm.ipv4_address
}}
"""
    with open(os.path.join(base_dir, "main.tf"), "w") as f:
        f.write(main_tf)

    # providers.tf
    prov_tf = """terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}
"""
    with open(os.path.join(base_dir, "providers.tf"), "w") as f:
        f.write(prov_tf)

    # variables.tf
    vars_tf = """variable "do_token" { type = string }
variable "region" { 
  type = string 
  default = "fra1" 
}
variable "ssh_public_key" { type = string }
variable "tailscale_auth_key" { type = string }
"""
    with open(os.path.join(base_dir, "variables.tf"), "w") as f:
        f.write(vars_tf)

    # secrets.tfvars
    secrets_tf = f"""# Account {account_index} DigitalOcean API Credentials
do_token           = "dop_v1_xxxxxx_account_{account_index}"
region             = "fra1"

# SSH Key for emergency local access
ssh_public_key     = "ssh-rsa AAAAB3Nza... team@local"

# Tailscale Auth 
tailscale_auth_key = "tskey-auth-xxxxxxxxx-xxxxxxxxx"
"""
    with open(os.path.join(base_dir, "secrets.tfvars"), "w") as f:
        f.write(secrets_tf)

# Main servers
rewrite_server("server1-app", 1, "Account 1")
rewrite_server("server2-support", 2, "Account 2")
rewrite_server("server3-security", 3, "Account 3")
rewrite_server("server4-engine", 4, "Account 4")

# Storage
rewrite_storage("server2-support", "smartmove-db-backups")
rewrite_storage("server3-security", "smartmove-observability")

# Micro VMs
rewrite_micro("vm1-bastion", 1)
rewrite_micro("vm2-log-forwarder", 1)
rewrite_micro("vm3-watchdog", 2)
rewrite_micro("vm4-tempo-cache", 2)
rewrite_micro("vm5-mimir-cache", 3)
rewrite_micro("vm6-loki-cache", 3)
rewrite_micro("vm7-image-optimizer", 4)
rewrite_micro("vm8-hot-spare", 4)

print("Migration scripts applied successfully!")
