# ============================================================
# utils/azure_blob_client.py
# Thin wrapper around azure-storage-blob for the pipeline.
# ============================================================

from __future__ import annotations

import logging
from pathlib import Path
from typing import Generator

from azure.storage.blob import BlobServiceClient, ContainerClient

logger = logging.getLogger(__name__)


def _get_blob_service_client(conn_str: str) -> BlobServiceClient:
    return BlobServiceClient.from_connection_string(conn_str)


ARCHIVE_PREFIX = "archive/"  # blobs moved here are never re-processed


def list_new_csv_blobs(
    connection_string: str,
    container: str,
    prefix: str = "",
    suffix: str = ".csv",
) -> list[str]:
    """Return blob names that match prefix/suffix, excluding the archive folder."""
    client = _get_blob_service_client(connection_string)
    container_client: ContainerClient = client.get_container_client(container)
    blobs = [
        blob.name
        for blob in container_client.list_blobs(name_starts_with=prefix)
        if blob.name.endswith(suffix)
        and not blob.name.startswith(ARCHIVE_PREFIX)   # skip already-archived files
    ]
    logger.info("Found %d new CSV blob(s) in %s/%s (archive excluded)", len(blobs), container, prefix)
    return blobs


def download_blob(
    connection_string: str,
    container: str,
    blob_name: str,
    local_path: Path,
) -> Path:
    """Download a blob to local_path and return the path."""
    local_path.parent.mkdir(parents=True, exist_ok=True)
    client = _get_blob_service_client(connection_string)
    blob_client = client.get_blob_client(container=container, blob=blob_name)
    with open(local_path, "wb") as f:
        data = blob_client.download_blob()
        data.readinto(f)
    logger.info("Downloaded blob %s → %s", blob_name, local_path)
    return local_path


def upload_blob(
    connection_string: str,
    container: str,
    blob_name: str,
    local_path: Path,
    overwrite: bool = True,
) -> None:
    """Upload a local file to blob storage."""
    client = _get_blob_service_client(connection_string)
    blob_client = client.get_blob_client(container=container, blob=blob_name)
    with open(local_path, "rb") as f:
        blob_client.upload_blob(f, overwrite=overwrite)
    logger.info("Uploaded %s → %s/%s", local_path, container, blob_name)


def delete_blob(
    connection_string: str,
    container: str,
    blob_name: str,
) -> None:
    """Delete a blob (called after successful processing)."""
    client = _get_blob_service_client(connection_string)
    blob_client = client.get_blob_client(container=container, blob=blob_name)
    blob_client.delete_blob()
    logger.info("Deleted processed blob %s/%s", container, blob_name)


def move_blob_to_archive(
    connection_string: str,
    source_container: str,
    blob_name: str,
    archive_container: str,
    archive_prefix: str = "archive/",
) -> None:
    """Copy a blob to the archive container then delete from source."""
    client = _get_blob_service_client(connection_string)
    source_url = (
        f"https://{client.account_name}.blob.core.windows.net"
        f"/{source_container}/{blob_name}"
    )
    dest_name = archive_prefix + blob_name
    dest_client = client.get_blob_client(container=archive_container, blob=dest_name)
    dest_client.start_copy_from_url(source_url)
    delete_blob(connection_string, source_container, blob_name)
    logger.info("Archived %s → %s/%s", blob_name, archive_container, dest_name)


def move_blob(connection_string: str, source_container: str, source_blob: str, dest_container: str, dest_blob: str):
    """
    Physically moves a blob from one container to another (e.g., Quarantine -> Staging).
    This ensures files are never processed twice.
    """
    logger.info(f"Moving blob from {source_container}/{source_blob} to {dest_container}/{dest_blob}...")
    client = _get_blob_service_client(connection_string)

    source_client = client.get_blob_client(container=source_container, blob=source_blob)
    dest_client = client.get_blob_client(container=dest_container, blob=dest_blob)

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

