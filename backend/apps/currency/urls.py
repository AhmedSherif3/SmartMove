from django.urls import path

from .views import LiveRatesView

urlpatterns = [
    path('rates/', LiveRatesView.as_view(), name='live-rates'),
]
