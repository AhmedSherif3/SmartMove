import os

def rewrite_server(server_name, index, account_name):
    base_dir = f"d:/SmartMove/infrastructure/terraform/main-servers/{server_name}"
    
    # main.tf
    main_tf = f"""terraform {{
  required_providers {{
    azurerm = {{
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }}
  }}
}}

provider "azurerm" {{
  features {{}}
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
  client_id       = var.azure_client_id
  client_secret   = var.azure_client_secret
}}

resource "azurerm_resource_group" "rg" {{
  name     = "smartmove-rg-{server_name}"
  location = var.location
}}

resource "azurerm_virtual_network" "vnet" {{
  name                = "smartmove-vnet-{server_name}"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}}

resource "azurerm_subnet" "subnet" {{
  name                 = "internal"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}}

resource "azurerm_network_security_group" "nsg" {{
  name                = "smartmove-nsg-{server_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {{
    name                       = "AllowHTTP"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }}

  security_rule {{
    name                       = "AllowHTTPS"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }}

  security_rule {{
    name                       = "AllowTailscale"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Udp"
    source_port_range          = "*"
    destination_port_range     = "41641"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }}
}}

resource "azurerm_public_ip" "pip" {{
  name                = "smartmove-pip-{server_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}}

resource "azurerm_network_interface" "nic" {{
  name                = "smartmove-nic-{server_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {{
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }}
}}

resource "azurerm_network_interface_security_group_association" "nic_nsg" {{
  network_interface_id      = azurerm_network_interface.nic.id
  network_security_group_id = azurerm_network_security_group.nsg.id
}}

resource "azurerm_linux_virtual_machine" "server" {{
  name                = "SmartMove-{server_name}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = "Standard_D4s_v5"
  admin_username      = "ubuntu"

  network_interface_ids = [
    azurerm_network_interface.nic.id,
  ]

  admin_ssh_key {{
    username   = "ubuntu"
    public_key = var.ssh_public_key
  }}

  os_disk {{
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 64
  }}

  source_image_reference {{
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }}

  custom_data = base64encode(<<-EOF
    #!/bin/bash
    curl -fsSL https://tailscale.com/install.sh | sh
    tailscale up --authkey=${{var.tailscale_auth_key}} --ssh
  EOF
  )
}}

resource "azurerm_managed_disk" "data" {{
  name                 = "smartmove-disk-{server_name}"
  location             = azurerm_resource_group.rg.location
  resource_group_name  = azurerm_resource_group.rg.name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 256
}}

resource "azurerm_virtual_machine_data_disk_attachment" "disk_attach" {{
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = azurerm_linux_virtual_machine.server.id
  lun                = 10
  caching            = "ReadWrite"
}}

output "public_ip" {{
  value = azurerm_public_ip.pip.ip_address
}}
"""
    with open(os.path.join(base_dir, "main.tf"), "w") as f:
        f.write(main_tf)

    # variables.tf
    vars_tf = """variable "azure_subscription_id" { type = string }
variable "azure_tenant_id" { type = string }
variable "azure_client_id" { type = string }
variable "azure_client_secret" { type = string }

variable "location" { 
  type = string 
  default = "West Europe" 
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

    secrets_tf = f"""# {account_name} Azure API Credentials
azure_subscription_id = "00000000-0000-0000-0000-00000000000{index}"
azure_tenant_id       = "00000000-0000-0000-0000-00000000000{index}"
azure_client_id       = "00000000-0000-0000-0000-00000000000{index}"
azure_client_secret   = "your_azure_client_secret_here"
location              = "West Europe"

# SSH Key for emergency local access
ssh_public_key     = "{ssh_key}"

# Tailscale Auth 
tailscale_auth_key = "tskey-auth-xxxxxxxxx-xxxxxxxxx"
"""
    with open(os.path.join(base_dir, "secrets.tfvars"), "w") as f:
        f.write(secrets_tf)

def rewrite_storage(server_name, storage_account_name, container_name):
    base_dir = f"d:/SmartMove/infrastructure/terraform/main-servers/{server_name}"
    storage_tf = f"""resource "azurerm_storage_account" "storage" {{
  name                     = "{storage_account_name}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}}

resource "azurerm_storage_container" "container" {{
  name                  = "{container_name}"
  storage_account_name  = azurerm_storage_account.storage.name
  container_access_type = "private"
}}

output "azure_storage_account_name" {{
  value = azurerm_storage_account.storage.name
}}
"""
    with open(os.path.join(base_dir, "storage.tf"), "w") as f:
        f.write(storage_tf)

def rewrite_micro(vm_name, account_index):
    base_dir = f"d:/SmartMove/infrastructure/terraform/micro-vms/{vm_name}"
    
    # main.tf
    main_tf = f"""resource "azurerm_resource_group" "rg" {{
  name     = "smartmove-rg-{vm_name}"
  location = var.location
}}

resource "azurerm_virtual_network" "vnet" {{
  name                = "smartmove-vnet-{vm_name}"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}}

resource "azurerm_subnet" "subnet" {{
  name                 = "internal"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}}

resource "azurerm_network_security_group" "nsg" {{
  name                = "smartmove-nsg-{vm_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {{
    name                       = "AllowTailscale"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Udp"
    source_port_range          = "*"
    destination_port_range     = "41641"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }}
}}

resource "azurerm_public_ip" "pip" {{
  name                = "smartmove-pip-{vm_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}}

resource "azurerm_network_interface" "nic" {{
  name                = "smartmove-nic-{vm_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {{
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }}
}}

resource "azurerm_network_interface_security_group_association" "nic_nsg" {{
  network_interface_id      = azurerm_network_interface.nic.id
  network_security_group_id = azurerm_network_security_group.nsg.id
}}

resource "azurerm_linux_virtual_machine" "vm" {{
  name                = "SmartMove-{vm_name}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = "Standard_B1s"
  admin_username      = "ubuntu"

  network_interface_ids = [
    azurerm_network_interface.nic.id,
  ]

  admin_ssh_key {{
    username   = "ubuntu"
    public_key = var.ssh_public_key
  }}

  os_disk {{
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
    disk_size_gb         = 32
  }}

  source_image_reference {{
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }}

  custom_data = base64encode(<<-EOF
    #!/bin/bash
    curl -fsSL https://tailscale.com/install.sh | sh
    tailscale up --authkey=${{var.tailscale_auth_key}} --ssh
  EOF
  )
}}

output "public_ip" {{
  value = azurerm_public_ip.pip.ip_address
}}
"""
    with open(os.path.join(base_dir, "main.tf"), "w") as f:
        f.write(main_tf)

    # providers.tf
    prov_tf = """terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
  client_id       = var.azure_client_id
  client_secret   = var.azure_client_secret
}
"""
    with open(os.path.join(base_dir, "providers.tf"), "w") as f:
        f.write(prov_tf)

    # variables.tf
    vars_tf = """variable "azure_subscription_id" { type = string }
variable "azure_tenant_id" { type = string }
variable "azure_client_id" { type = string }
variable "azure_client_secret" { type = string }

variable "location" { 
  type = string 
  default = "West Europe" 
}
variable "ssh_public_key" { type = string }
variable "tailscale_auth_key" { type = string }
"""
    with open(os.path.join(base_dir, "variables.tf"), "w") as f:
        f.write(vars_tf)

    # secrets.tfvars
    secrets_tf = f"""# Account {account_index} Azure API Credentials
azure_subscription_id = "00000000-0000-0000-0000-00000000000{account_index}"
azure_tenant_id       = "00000000-0000-0000-0000-00000000000{account_index}"
azure_client_id       = "00000000-0000-0000-0000-00000000000{account_index}"
azure_client_secret   = "your_azure_client_secret_here"
location              = "West Europe"

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
# Azure storage account names must be between 3 and 24 characters in length and may contain numbers and lowercase letters only.
rewrite_storage("server2-support", "smartmovedbbackups123", "smartmove-db-backups")
rewrite_storage("server3-security", "smartmoveobservability123", "smartmove-observability")

# Micro VMs
rewrite_micro("vm1-bastion", 1)
rewrite_micro("vm2-log-forwarder", 1)
rewrite_micro("vm3-watchdog", 2)
rewrite_micro("vm4-tempo-cache", 2)
rewrite_micro("vm5-mimir-cache", 3)
rewrite_micro("vm6-loki-cache", 3)
rewrite_micro("vm7-image-optimizer", 4)
rewrite_micro("vm8-hot-spare", 4)

print("Azure Migration scripts applied successfully!")
