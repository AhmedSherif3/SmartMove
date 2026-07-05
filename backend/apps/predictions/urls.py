"""
Predictions URL Configuration
"""

from django.urls import path

from .views import ForecastAPIView

urlpatterns = [
    path("forecasts/", ForecastAPIView.as_view(), name="forecast-list"),
]