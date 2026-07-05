"""
Forecast Model — apps.predictions
===================================
Unmanaged model that maps to the ``fact_forecasts`` table populated
by the Airflow ML pipeline.  Django treats this as read-only; all
writes are handled exclusively by Airflow DAGs.
"""

from django.db import models  # type: ignore[import-untyped]


class Forecast(models.Model):
    """
    Read-only ORM representation of the ``fact_forecasts`` table.

    The table lifecycle (CREATE, INSERT, TRUNCATE) is managed entirely
    by the Airflow ``generate_forecast`` DAG.  Django only reads from it
    via this model and the ``vw_forecasts_safe`` database view.
    """

    objects = models.Manager()  # type: ignore[assignment]  # Explicit default manager for Pyright

    date = models.DateField(
        help_text="Forecast date (monthly granularity).",
    )
    region = models.CharField(
        max_length=20,
        help_text="Geographic region: Dubai, Egypt, England.",
    )
    area = models.CharField(
        max_length=100,
        help_text="Sub-area within the region (e.g. 'Downtown Dubai', 'New Cairo').",
    )
    property_type = models.CharField(
        max_length=50,
        help_text="Property classification: Apartment, Villa, Townhouse, etc.",
    )
    scenario = models.CharField(
        max_length=20,
        help_text="Forecast scenario: Normal, Best_Case, Worst_Case.",
    )
    projected_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        help_text="Predicted property price in local currency.",
    )
    projected_rent = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Predicted annual rental income in local currency.",
    )
    projected_roi_percentage = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="Projected 10-year Return on Investment (%).",
    )

    class Meta:
        managed = False  # Airflow owns the DDL for this table.
        db_table = "fact_forecasts"
        ordering = ["region", "area", "date"]
        verbose_name = "Forecast"
        verbose_name_plural = "Forecasts"

    def __str__(self) -> str:
        return (
            f"{self.region} › {self.area} | {self.date} | "
            f"{self.scenario} — ROI {self.projected_roi_percentage}%"
        )
