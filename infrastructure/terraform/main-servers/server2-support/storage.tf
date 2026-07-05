resource "azurerm_storage_account" "storage" {
  name                     = "smartmovedbbackups123"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "container" {
  name                  = "smartmove-db-backups"
  storage_account_name  = azurerm_storage_account.storage.name
  container_access_type = "private"
}

output "azure_storage_account_name" {
  value = azurerm_storage_account.storage.name
}
