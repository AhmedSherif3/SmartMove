"""
Azure Blob Storage Utilities
-----------------------------
Centralized helpers for SAS token generation, blob upload (streaming), 
and blob download. Used by both the Upload app and the Integrations app.
"""
import io
import os
from datetime import datetime, timedelta, timezone

from azure.storage.blob import (
    BlobServiceClient,
    BlobSasPermissions,
    generate_blob_sas,
)



def _get_connection_string() -> str:
    """Get Azure Storage connection string from environment."""
    conn_str = os.environ.get('AZURE_STORAGE_CONNECTION_STRING')
    if not conn_str:
        raise ValueError("AZURE_STORAGE_CONNECTION_STRING environment variable is not set.")
    return conn_str


def _parse_account_info(conn_str: str) -> tuple[str, str]:
    """Extract account name and account key from a connection string."""
    parts = dict(part.split('=', 1) for part in conn_str.split(';') if '=' in part)
    return parts.get('AccountName', ''), parts.get('AccountKey', '')


def get_container_name(region: str) -> str:
    """
    Maps a frontend region string to the correct Azure container name via environment variables.
    
    Raises:
        ValueError: If the region is not recognized or missing in .env.
    """
    env_var = f"AZURE_QUARANTINE_{region.upper()}"
    container = os.environ.get(env_var)
    if not container:
        raise ValueError(f"Unknown region or missing env var: {env_var}")
    return container


def generate_sas_url(blob_name: str, container: str) -> str:
    """
    Generates a write-only SAS URL that expires in 4 hours.
    Used by the frontend for direct-to-Azure uploads.
    
    Returns:
        Full URL string with SAS token appended.
    """
    conn_str = _get_connection_string()
    account_name, account_key = _parse_account_info(conn_str)

    sas_token = generate_blob_sas(
        account_name=account_name,
        container_name=container,
        blob_name=blob_name,
        account_key=account_key,
        permission=BlobSasPermissions(write=True),
        expiry=datetime.now(timezone.utc) + timedelta(hours=4),
    )

    return f"https://{account_name}.blob.core.windows.net/{container}/{blob_name}?{sas_token}"


def upload_blob_from_stream(container: str, blob_name: str, stream) -> None:
    """
    Uploads data to Azure Blob Storage from a streaming source.
    
    Safety Net #1 (RAM Protection): Accepts a requests.Response iterator
    or any iterable — the Azure SDK natively handles streaming uploads 
    without buffering the entire file in memory.
    
    Args:
        container: Target container name
        blob_name: Target blob path
        stream: An iterable/generator (e.g., response.iter_content()) or BytesIO
    """
    conn_str = _get_connection_string()
    blob_service_client = BlobServiceClient.from_connection_string(conn_str)
    blob_client = blob_service_client.get_blob_client(container=container, blob=blob_name)
    
    blob_client.upload_blob(data=stream, overwrite=True)


def download_blob_to_stream(container: str, blob_name: str) -> io.BytesIO:
    """
    Downloads a blob from Azure into a BytesIO buffer.
    
    Used by the validation task — only reads first 50 rows via pandas,
    so memory footprint stays small even for large files.
    
    Returns:
        BytesIO buffer containing the blob contents.
    """
    conn_str = _get_connection_string()
    blob_service_client = BlobServiceClient.from_connection_string(conn_str)
    blob_client = blob_service_client.get_blob_client(container=container, blob=blob_name)
    
    stream = io.BytesIO()
    download_stream = blob_client.download_blob()
    download_stream.readinto(stream)
    stream.seek(0)
    
    return stream


PROFILE_PHOTOS_CONTAINER = 'profile-photos'


def generate_read_sas_url(blob_name: str, container: str, expiry_days: int = 365) -> str:
    """
    Generates a read-only SAS URL for serving blobs (e.g., profile photos).

    Args:
        blob_name: The blob path within the container
        container: Azure container name
        expiry_days: How long the URL stays valid (default 365 days)

    Returns:
        Full URL string with SAS token appended.
    """
    conn_str = _get_connection_string()
    account_name, account_key = _parse_account_info(conn_str)

    sas_token = generate_blob_sas(
        account_name=account_name,
        container_name=container,
        blob_name=blob_name,
        account_key=account_key,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.now(timezone.utc) + timedelta(days=expiry_days),
    )

    return f"https://{account_name}.blob.core.windows.net/{container}/{blob_name}?{sas_token}"


def upload_profile_photo(user_id: int, file_obj) -> str:
    """
    Uploads a profile photo to Azure and returns a read-only SAS URL.

    Args:
        user_id: The user's database PK (used to namespace the blob)
        file_obj: An UploadedFile from the request (e.g., request.FILES['photo'])

    Returns:
        A public-readable SAS URL for the uploaded photo.
    """
    import uuid

    ext = file_obj.name.rsplit('.', 1)[-1].lower() if '.' in file_obj.name else 'jpg'
    blob_name = f"{user_id}/{uuid.uuid4().hex[:12]}.{ext}"

    upload_blob_from_stream(
        container=PROFILE_PHOTOS_CONTAINER,
        blob_name=blob_name,
        stream=file_obj,
    )

    return generate_read_sas_url(
        blob_name=blob_name,
        container=PROFILE_PHOTOS_CONTAINER,
    )

