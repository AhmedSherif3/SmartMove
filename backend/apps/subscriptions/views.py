from __future__ import annotations

# Handles HTTP requests from Next.js (e.g., initiating Checkout Sessions)
from typing import Any

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.conf import settings

from .models import CustomerProfile, Subscription
from .services import (
    create_checkout_session, 
    cancel_subscription_immediately,
    check_existing_subscription,
    upgrade_role_subscription,
    consolidate_report_subscriptions
)


class SubscriptionPlansAPIView(APIView):
    """
    GET: Returns a list of all available subscription tiers.
    """
    permission_classes = [AllowAny]

    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        plans = []
        for plan_id, info in getattr(settings, 'LEMON_SQUEEZY_PLAN_MAP', {}).items():
            plans.append({
                "plan_id": plan_id,
                "plan_type": info.get("plan_type"),
                "category": info.get("category"),
            })
        return Response(plans, status=status.HTTP_200_OK)


class CheckoutSessionAPIView(APIView):
    """
    POST: Initializes a Lemon Squeezy Checkout Session or upgrades directly.
    Expects JSON: {"plan": "report_single", "region": "egypt", "quantity": 1}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        plan_id: str | None = request.data.get('plan')  # type: ignore[union-attr]
        quantity: int = int(request.data.get('quantity', 1))
        region: str | None = request.data.get('region', None)

        if not plan_id:
            return Response(
                {"error": "plan is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan_info = getattr(settings, 'LEMON_SQUEEZY_PLAN_MAP', {}).get(plan_id)
        if not plan_info:
            return Response(
                {"error": "Invalid plan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        variant_id = plan_info['variant_id']
        plan_type = plan_info['plan_type']
        category = plan_info['category']

        # Define where Lemon Squeezy sends the user after they pay (or cancel the checkout)
        frontend_url: str = str(settings.FRONTEND_URL)
        success_url: str = f"{frontend_url}/pricing?success=true"
        cancel_url: str = f"{frontend_url}/pricing?canceled=true"

        # Special Case: Single Market Report Verification
        if plan_id == 'report_single':
            if not region or region not in ['egypt', 'dubai', 'england']:
                return Response(
                    {"error": "A valid region (egypt, dubai, or england) is required for a single report."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Check if user has All Regions Report active
            has_all_reports = Subscription.objects.filter(
                user=request.user, plan_type='report_all', status__in=['active', 'trialing']
            ).exists()
            
            # Check if user has Analyst Pro Max (which includes all reports)
            has_pro_max = Subscription.objects.filter(
                user=request.user, plan_type='analyst_pro_max', status__in=['active', 'trialing']
            ).exists()
            
            if has_all_reports or has_pro_max:
                return Response(
                    {"error": "You already have access to all region reports under your current subscription."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
                
            # Check if user is already subscribed to this specific report
            has_this_region = Subscription.objects.filter(
                user=request.user, plan_type=f'report_single_{region}', status__in=['active', 'trialing']
            ).exists()
            if has_this_region:
                return Response(
                    {"error": f"You are already subscribed to the {region} report."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Special Case: All Regions Bundle / Report All
        if plan_id == 'report_all':
            existing_bundle = Subscription.objects.filter(
                user=request.user, plan_type='report_all', status__in=['active', 'trialing']
            ).exists()
            if existing_bundle:
                return Response(
                    {"error": "You are already subscribed to the all-regions reports bundle."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                consolidate_report_subscriptions(request.user)
            except Exception as e:
                return Response(
                    {"error": f"Failed to consolidate existing report subscriptions. Please try again. Details: {e}"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        existing_sub = check_existing_subscription(request.user, plan_id)

        try:
            # Immediate intra-category upgrade for role (e.g. analyst to analyst_pro_max)
            if existing_sub and category == 'role':
                upgrade_role_subscription(request.user, existing_sub, variant_id, plan_type)
                # Skip Checkout and return success URL directly
                return Response({"checkout_url": success_url}, status=status.HTTP_200_OK)

            # Otherwise, Handoff to our services.py utility for a new checkout session
            checkout_url: str | None = create_checkout_session(
                user=request.user,
                variant_id=variant_id,
                plan_type=plan_type,
                success_url=success_url,
                cancel_url=cancel_url,
                quantity=quantity,
                region=region,
            )
            return Response({"checkout_url": checkout_url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CancelSubscriptionAPIView(APIView):
    """
    POST: Triggers the immediate cancellation of a specific feature.
    Expects JSON: {"plan_type": "storage_expansion"}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        plan_type: str | None = request.data.get('plan_type')  # type: ignore[union-attr]

        if not plan_type:
            return Response(
                {"error": "plan_type is required to process cancellation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cancel_subscription_immediately(user=request.user, plan_type=plan_type)
            return Response(
                {"message": f"Successfully canceled {plan_type}. Storage quota updated."},
                status=status.HTTP_200_OK,
            )
        except ValueError as ve:
            return Response({"error": str(ve)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionStatusAPIView(APIView):
    """
    GET: Returns the user's active capabilities.
    The Next.js frontend calls this on load to know which UI elements to unlock.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        # 1. Get the master profile for MinIO storage logic
        profile, _ = CustomerProfile.objects.get_or_create(user=request.user)
        total_storage_gb: int = profile.get_total_storage_allowance()

        # 2. Get a list of all currently active plan types
        active_subscriptions = list(
            Subscription.objects.filter(
                user=request.user,
                status__in=['active', 'trialing'],
            ).values_list('plan_type', flat=True)
        )

        return Response({
            "role": profile.role,
            "total_minio_storage_gb": total_storage_gb,
            "active_plans": active_subscriptions,
        }, status=status.HTTP_200_OK)