from prometheus_client import Gauge

# Prometheus metrics
smartmove_workspace_files_uploaded_total = Gauge(
    'smartmove_workspace_files_uploaded_total',
    'Total number of files uploaded to the AI Data Workspace'
)

smartmove_workspace_storage_bytes_used = Gauge(
    'smartmove_workspace_storage_bytes_used',
    'Total storage bytes used in the AI Data Workspace'
)
