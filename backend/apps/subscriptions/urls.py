from __future__ import annotations

from django.urls import path
from . import views
from .webhooks import LemonSqueezyWebhookAPIView
from .airflow_views import AirflowMailingListView, SubscriptionMatrixFilterView

app_name = 'subscriptions'

urlpatterns = [
    # Frontend interacting views (from views.py)
    path('plans/', views.SubscriptionPlansAPIView.as_view(), name='plans'),
    path('checkout/', views.CheckoutSessionAPIView.as_view(), name='checkout'),
    path('cancel/', views.CancelSubscriptionAPIView.as_view(), name='cancel'),
    path('status/', views.SubscriptionStatusAPIView.as_view(), name='status'),

    # Direct Lemon Squeezy webhook listener (from webhooks.py)
    path('webhook/', LemonSqueezyWebhookAPIView.as_view(), name='webhook'),

    # Internal Airflow endpoint for regional mailing lists (from airflow_views.py)
    path('airflow/mailing-list/', AirflowMailingListView.as_view(), name='airflow-mailing-list'),
    path('matrix/', SubscriptionMatrixFilterView.as_view(), name='matrix-filter'),
]