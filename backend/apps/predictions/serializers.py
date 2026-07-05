"""
Forecast Serializer — apps.predictions
========================================
"""

from rest_framework import serializers

from .models import Forecast


class ForecastSerializer(serializers.ModelSerializer):
    """Read-only serializer for the ``Forecast`` (``fact_forecasts``) model."""

    class Meta:
        model = Forecast
        fields = [
            "date",
            "region",
            "area",
            "property_type",
            "scenario",
            "projected_price",
            "projected_rent",
            "projected_roi_percentage",
        ]
        read_only_fields = fields
