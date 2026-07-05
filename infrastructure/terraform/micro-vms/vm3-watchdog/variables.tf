variable "azure_subscription_id" { type = string }
variable "azure_tenant_id" { type = string }
variable "azure_client_id" { type = string }
variable "azure_client_secret" { type = string }

variable "location" {
  type    = string
  default = "West Europe"
}
variable "ssh_public_key" { type = string }
variable "tailscale_auth_key" { type = string }
