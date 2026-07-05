from __future__ import annotations

import hmac
import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import IntegrityError
from rest_framework.views import APIView
from rest_framework.request import Request

from .models import CustomerProfile, Subscription
from apps.users.models import User

@method_decorator(csrf_exempt, name='dispatch')
class LemonSqueezyWebhookAPIView(APIView):
    """
    POST: Listens for Lemon Squeezy events to keep the Django database synchronized.
    Must be exempt from CSRF because Lemon Squeezy's servers are sending the POST request.
    """
    authentication_classes: list[Any] = []
    permission_classes: list[Any] = []

    def post(self, request: Request, *args: Any, **kwargs: Any) -> HttpResponse:
        payload: bytes = request.body
        sig_header: str | None = request.META.get('HTTP_X_SIGNATURE')
        endpoint_secret: str = str(settings.LEMON_SQUEEZY_WEBHOOK_SECRET)

        if not sig_header:
            return HttpResponse("Missing signature", status=400)

        # Cryptographically verify the event actually came from Lemon Squeezy
        digest = hmac.new(
            endpoint_secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(digest, sig_header):
            return HttpResponse("Invalid signature", status=400)

        try:
            event = json.loads(payload.decode('utf-8'))
        except ValueError:
            return HttpResponse("Invalid payload", status=400)

        event_name = event.get('meta', {}).get('event_name')

        if event_name == 'subscription_created':
            self._handle_subscription_created(event)

        elif event_name == 'subscription_updated':
            self._handle_subscription_updated(event)

        elif event_name in ('subscription_cancelled', 'subscription_expired'):
            self._handle_subscription_deleted(event)

        return HttpResponse(status=200)

    def _parse_date(self, date_str: str | None) -> datetime:
        if not date_str:
            return datetime.now(timezone.utc)
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))

    def _recalculate_user_profile(self, user: User) -> None:
        """
        Recalculates the user's role and storage parameters based on active subscriptions,
        and saves the CustomerProfile and User objects.
        """
        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        
        # 1. Check for analyst or pro max subscriptions
        has_pro_max = Subscription.objects.filter(
            user=user,
            plan_type='analyst_pro_max',
            status__in=['active', 'trialing']
        ).exists()
        
        has_analyst = Subscription.objects.filter(
            user=user,
            plan_type='analyst',
            status__in=['active', 'trialing']
        ).exists()
        
        # Determine core tier
        if has_pro_max or has_analyst:
            profile.role = 'data_analyst'
            user.role = User.Role.DATA_ANALYST
        else:
            profile.role = 'user'
            user.role = User.Role.USER
        user.save()
        
        # 2. Recalculate additional storage (not including the base 5GB/1GB)
        additional_gb = 0
        if has_pro_max:
            # Analyst Pro Max gets all possible storage (9GB additional storage)
            additional_gb = 9
        else:
            # Sum up extra storage subscriptions
            storage_subs = Subscription.objects.filter(
                user=user,
                plan_type__in=['storage_per_gb', 'storage_5gb', 'storage_9gb'],
                status__in=['active', 'trialing']
            )
            for sub in storage_subs:
                if sub.plan_type == 'storage_per_gb':
                    additional_gb += sub.quantity
                elif sub.plan_type == 'storage_5gb':
                    additional_gb += 5
                elif sub.plan_type == 'storage_9gb':
                    additional_gb += 9
                    
        profile.additional_storage_gb = additional_gb
        profile.save()

    def _handle_subscription_created(self, event: dict[str, Any]) -> None:
        """Fires when a user successfully pays for a new plan."""
        custom_data = event.get('meta', {}).get('custom_data', {})
        user_id = custom_data.get('django_user_id')
        plan_type = custom_data.get('plan_type')
        region = custom_data.get('region')

        if not user_id or not plan_type:
            return

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return

        # Resolve single report region if applicable
        if plan_type == 'report_single' and region:
            plan_type = f"report_single_{region}"

        data = event.get('data', {})
        subscription_id = str(data.get('id', ''))
        attributes = data.get('attributes', {})
        
        variant_id = str(attributes.get('variant_id', ''))
        status = str(attributes.get('status', ''))
        renews_at = attributes.get('renews_at')
        quantity = int(attributes.get('quantity', 1))
        
        current_period_end = self._parse_date(renews_at)

        try:
            sub, created = Subscription.objects.update_or_create(
                ls_subscription_id=subscription_id,
                defaults={
                    'user': user,
                    'ls_variant_id': variant_id,
                    'plan_type': plan_type,
                    'quantity': quantity,
                    'status': status,
                    'current_period_end': current_period_end,
                }
            )
        except IntegrityError:
            return

        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        profile.ls_customer_id = str(attributes.get('customer_id', ''))
        profile.save()

        # Recalculate everything
        self._recalculate_user_profile(user)

    def _handle_subscription_updated(self, event: dict[str, Any]) -> None:
        """Fires on renewals or mid-cycle changes."""
        data = event.get('data', {})
        subscription_id = str(data.get('id', ''))
        attributes = data.get('attributes', {})

        try:
            local_sub = Subscription.objects.get(ls_subscription_id=subscription_id)
            local_sub.status = str(attributes.get('status', ''))
            
            renews_at = attributes.get('renews_at')
            if renews_at:
                local_sub.current_period_end = self._parse_date(renews_at)
                
            local_sub.cancel_at_period_end = bool(attributes.get('cancelled', False))
            
            variant_id = attributes.get('variant_id')
            if variant_id:
                local_sub.ls_variant_id = str(variant_id)
                
            quantity = attributes.get('quantity')
            if quantity is not None:
                local_sub.quantity = int(quantity)
                
            local_sub.save()
            
            self._recalculate_user_profile(local_sub.user)
        except Subscription.DoesNotExist:
            pass

    def _handle_subscription_deleted(self, event: dict[str, Any]) -> None:
        """
        Fires when a sub lapses or is killed via our immediate cancel feature.
        """
        data = event.get('data', {})
        subscription_id = str(data.get('id', ''))

        try:
            local_sub = Subscription.objects.get(ls_subscription_id=subscription_id)
            local_sub.status = 'canceled'
            local_sub.cancel_at_period_end = False
            local_sub.save()

            self._recalculate_user_profile(local_sub.user)
        except Subscription.DoesNotExist:
            pass