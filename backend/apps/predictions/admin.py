"""
Predictions Admin Configuration
"""

from django.contrib import admin

from .models import Forecast


@admin.register(Forecast)
class ForecastAdmin(admin.ModelAdmin):
    """Read-only admin view for the Airflow-managed fact_forecasts table."""

    list_display = (
        "date",
        "region",
        "area",
        "property_type",
        "scenario",
        "projected_price",
        "projected_rent",
        "projected_roi_percentage",
    )
    list_filter = ("region", "scenario", "property_type")
    search_fields = ("area",)
    date_hierarchy = "date"

    def has_add_permission(self, request):
        return False  # Airflow manages writes

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
