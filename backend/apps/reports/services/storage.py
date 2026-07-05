"""
SmartMove Reports — Azure Blob Storage Service

Handles uploading generated PDF reports to Azure Blob Storage.

CURRENT STATE: Mock implementation.
    Returns a deterministic fake URL.  Clearly marked for replacement
    with the real ``azure-storage-blob`` SDK when the reports container
    is provisioned in Azure.

PRODUCTION REPLACEMENT:
    Swap the body of ``upload_to_azure`` with:
        from azure.storage.blob import BlobServiceClient
        blob_service = BlobServiceClient.from_connection_string(conn_str)
        blob_client = blob_service.get_blob_client(container, blob_name)
        blob_client.upload_blob(pdf_bytes, overwrite=True)
        return blob_client.url
"""

import logging

logger = logging.getLogger('apps.reports.services.storage')

from datetime import datetime, timedelta
from django.conf import settings
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions

def generate_sas_url(blob_url: str) -> str:
    """
    Appends a secure 24-hour read-only SAS token to a direct Azure Blob URL.
    """
    if not blob_url:
        return ""
    
    conn_str = getattr(settings, 'AZURE_STORAGE_CONNECTION_STRING', '')
    if not conn_str:
        return blob_url
        
    try:
        # Extract AccountName and AccountKey from connection string
        params = dict(item.split('=', 1) for item in conn_str.split(';') if '=' in item)
        account_name = params.get('AccountName')
        account_key = params.get('AccountKey')
        
        if not account_name or not account_key:
            return blob_url
            
        # Parse blob_url to get container and blob path
        # Format: https://<account_name>.blob.core.windows.net/<container>/<blob_name>
        parts = blob_url.split('.blob.core.windows.net/', 1)
        if len(parts) < 2:
            return blob_url
            
        path_part = parts[1]
        path_parts = path_part.split('/', 1)
        if len(path_parts) < 2:
            return blob_url
            
        import urllib.parse
        container_name = urllib.parse.unquote(path_parts[0])
        blob_name = urllib.parse.unquote(path_parts[1])
        
        # Generate SAS token valid for 24 hours
        sas_token = generate_blob_sas(
            account_name=account_name,
            account_key=account_key,
            container_name=container_name,
            blob_name=blob_name,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=24)
        )
        
        # We must keep the original URL-encoded URL and just append the generated token
        return f"{blob_url}?{sas_token}"
    except Exception as e:
        logger.exception("Failed to generate SAS token for blob URL: %s", blob_url)
        return blob_url


def upload_to_azure(
    pdf_bytes: bytes,
    blob_name: str,
    container: str = "reports",
) -> str:
    """
    Upload a PDF byte buffer to Azure Blob Storage.

    Parameters
    ----------
    pdf_bytes : bytes
        The raw PDF file content.
    blob_name : str
        The blob path within the container.
    container: str
        The Azure blob container name.

    Returns
    -------
    str
        The public URL of the uploaded blob.
    """
    conn_str = str(settings.AZURE_STORAGE_CONNECTION_STRING)
    blob_service = BlobServiceClient.from_connection_string(conn_str)
    blob_client = blob_service.get_blob_client(container=container, blob=blob_name)
    blob_client.upload_blob(pdf_bytes, overwrite=True)
    
    logger.info(
        "Uploaded %d bytes → %s",
        len(pdf_bytes),
        blob_client.url,
    )
    
    return blob_client.url
