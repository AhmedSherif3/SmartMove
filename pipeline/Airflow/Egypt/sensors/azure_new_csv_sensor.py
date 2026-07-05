# ============================================================
# sensors/azure_new_csv_sensor.py
# Custom Airflow sensor that pokes an Azure Blob Storage
# container for new CSV files under a given prefix.
#
# When new files are found their names are pushed to XCom so
# downstream tasks can fetch them with:
#   context["ti"].xcom_pull(task_ids="sense_new_csv_files")
# ============================================================

from __future__ import annotations

import logging
from typing import Any

from airflow.sensors.base import BaseSensorOperator
from airflow.utils.context import Context

from utils.azure_blob_client import list_new_csv_blobs

logger = logging.getLogger(__name__)


class AzureNewCsvSensor(BaseSensorOperator):
    """
    Polls an Azure Blob Storage container for new CSV files.

    Parameters
    ----------
    connection_string : str
        Azure Blob Storage connection string.
    container : str
        Container name to monitor.
    prefix : str
        Blob name prefix (folder path) to narrow the search.
    suffix : str
        File extension to filter on (default: '.csv').
    """

    template_fields = ("container", "prefix")
    ui_color = "#0078D4"  # Azure blue

    def __init__(
        self,
        *,
        connection_string: str,
        container: str,
        prefix: str = "",
        suffix: str = ".csv",
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.connection_string = connection_string
        self.container = container
        self.prefix = prefix
        self.suffix = suffix

    def poke(self, context: Context) -> bool:  # type: ignore[override]
        logger.info(
            "Poking container='%s' prefix='%s' for *%s files …",
            self.container,
            self.prefix,
            self.suffix,
        )
        blobs = list_new_csv_blobs(
            connection_string=self.connection_string,
            container=self.container,
            prefix=self.prefix,
            suffix=self.suffix,
        )

        if not blobs:
            logger.info("No new CSV files found yet.")
            return False

        logger.info("Found %d new CSV file(s): %s", len(blobs), blobs)
        # Push list of blob names so downstream tasks know what to process
        context["ti"].xcom_push(key="new_csv_blobs", value=blobs)
        return True
