import logging
from pathlib import Path
from azure.storage.blob import BlobServiceClient

logger = logging.getLogger(__name__)

def download_blob(connection_string: str, container: str, blob_name: str, local_path: str | Path):
    """Downloads a blob from Azure to the local Airflow worker disk."""
    logger.info(f"Downloading {blob_name} from {container} to {local_path}...")
    blob_service_client = BlobServiceClient.from_connection_string(connection_string)
    blob_client = blob_service_client.get_blob_client(container=container, blob=blob_name)
    
    with open(local_path, "wb") as download_file:
        download_file.write(blob_client.download_blob().readall())
    logger.info("Download complete.")

def upload_blob(connection_string: str, container: str, blob_name: str, local_path: str | Path):
    """Uploads a local file back to Azure Blob Storage."""
    logger.info(f"Uploading {local_path} to {container}/{blob_name}...")
    blob_service_client = BlobServiceClient.from_connection_string(connection_string)
    blob_client = blob_service_client.get_blob_client(container=container, blob=blob_name)
    
    with open(local_path, "rb") as data:
        blob_client.upload_blob(data, overwrite=True)
    logger.info("Upload complete.")

def move_blob(connection_string: str, source_container: str, source_blob: str, dest_container: str, dest_blob: str):
    """
    Physically moves a blob from one container to another (e.g., Quarantine -> Staging).
    This ensures files are never processed twice.
    """
    logger.info(f"Moving blob from {source_container}/{source_blob} to {dest_container}/{dest_blob}...")
    blob_service_client = BlobServiceClient.from_connection_string(connection_string)
    
    source_client = blob_service_client.get_blob_client(container=source_container, blob=source_blob)
    dest_client = blob_service_client.get_blob_client(container=dest_container, blob=dest_blob)
    
    # 1. Start the copy process
    dest_client.start_copy_from_url(source_client.url)
    
    # 2. Verify the copy succeeded before deleting the original
    properties = dest_client.get_blob_properties()
    if properties.copy.status == "success":
        source_client.delete_blob()
        logger.info("Move successful. Original blob deleted.")
    else:
        logger.error(f"Failed to move blob. Copy status: {properties.copy.status}")
        raise Exception("Blob move operation failed during copy.")
   
def list_new_csv_blobs(connection_string: str, container: str, prefix: str = "", suffix: str = ".csv") -> list[str]:
    """
    Lists all blobs in a container matching the prefix and suffix.
    Used by the AzureNewCsvSensor to detect new files in Quarantine.
    """
    logger.info(f"Listing blobs in {container} with prefix '{prefix}' and suffix '{suffix}'...")
    blob_service_client = BlobServiceClient.from_connection_string(connection_string)
    container_client = blob_service_client.get_container_client(container)
    
    blob_names = []
    # Walk through all blobs in the container
    for blob in container_client.list_blobs(name_starts_with=prefix):
        if blob.name.lower().endswith(suffix.lower()):
            blob_names.append(blob.name)
            
    return blob_names
