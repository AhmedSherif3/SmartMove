from __future__ import annotations

import requests
from typing import Any
from django.conf import settings
from .models import CustomerProfile, Subscription
from apps.users.models import User

def get_ls_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.LEMON_SQUEEZY_API_KEY}",
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
    }

def get_or_create_customer(user: Any) -> str | None:
    """
    In Lemon Squeezy, customer creation is usually handled during checkout.
    We just ensure the profile exists. ls_customer_id will be populated by the webhook.
    """
    profile, _ = CustomerProfile.objects.get_or_create(user=user)
    return profile.ls_customer_id if profile.ls_customer_id else None

def create_checkout_session(
    user: Any,
    variant_id: str,
    plan_type: str,
    success_url: str,
    cancel_url: str,
    quantity: int = 1,
    region: str | None = None,
) -> str | None:
    """
    Generates a secure Lemon Squeezy Checkout URL for the Next.js frontend to redirect to.
    Handles Analyst upgrade, Single region reports, and Storage sliders.
    """
    get_or_create_customer(user)
    url = "https://api.lemonsqueezy.com/v1/checkouts"
    
    # Base attributes
    attributes: dict[str, Any] = {
        "checkout_data": {
            "email": user.email,
            "custom": {
                "django_user_id": str(user.id),
                "plan_type": plan_type,
            }
        },
        "product_options": {
            "redirect_url": success_url,
        }
    }
    
    # Store region metadata if purchasing single report
    if region:
        attributes["checkout_data"]["custom"]["region"] = region
        
    # Store variant quantities if quantity > 1 (slider purchase)
    if quantity > 1:
        attributes["checkout_data"]["variant_quantities"] = [
            {
                "variant_id": int(variant_id) if isinstance(variant_id, str) and variant_id.isdigit() else variant_id,
                "quantity": quantity
            }
        ]
        
    payload = {
        "data": {
            "type": "checkouts",
            "attributes": attributes,
            "relationships": {
                "store": {
                    "data": {
                        "type": "stores",
                        "id": str(settings.LEMON_SQUEEZY_STORE_ID)
                    }
                },
                "variant": {
                    "data": {
                        "type": "variants",
                        # pyrefly: ignore [unnecessary-type-conversion]
                        "id": str(variant_id)
                    }
                }
            }
        }
    }

    try:
        response = requests.post(url, headers=get_ls_headers(), json=payload)
        response.raise_for_status()
        data = response.json()
        return str(data["data"]["attributes"]["url"])
    except Exception as e:
        # Include detailed api response for easier debugging
        response_body = ""
        # pyrefly: ignore [unbound-name]
        if 'response' in locals() and hasattr(response, 'text'):
            response_body = f" | Response Body: {response.text}"
        raise RuntimeError(f"Failed to create checkout session: {e}{response_body}") from e

def check_existing_subscription(user: Any, plan_id: str) -> Any | None:
    """
    Returns the user's current active subscription in the SAME category as the requested plan_id, if any.
    """
    plan_info = settings.LEMON_SQUEEZY_PLAN_MAP.get(plan_id)
    if not plan_info:
        return None
        
    category = plan_info.get('category')
    
    if category == 'role':
        category_plan_types = ['analyst', 'analyst_pro_max']
    elif category == 'reports':
        category_plan_types = ['report_single_egypt', 'report_single_dubai', 'report_single_england', 'report_all']
    elif category == 'storage':
        category_plan_types = ['storage_per_gb', 'storage_5gb', 'storage_9gb']
    else:
        category_plan_types = []
        
    return Subscription.objects.filter(
        user=user, 
        plan_type__in=category_plan_types, 
        status__in=['active', 'trialing']
    ).first()

def upgrade_role_subscription(user: Any, existing_sub: Any, new_variant_id: str, new_plan_type: str) -> None:
    """
    Immediately upgrades an existing role subscription to a new tier via Lemon Squeezy API.
    """
    url = f"https://api.lemonsqueezy.com/v1/subscriptions/{existing_sub.ls_subscription_id}"
    payload = {
        "data": {
            "type": "subscriptions",
            "id": str(existing_sub.ls_subscription_id),
            "attributes": {
                "variant_id": int(new_variant_id) if isinstance(new_variant_id, str) and new_variant_id.isdigit() else new_variant_id
            }
        }
    }
    try:
        response = requests.patch(url, headers=get_ls_headers(), json=payload)
        response.raise_for_status()
        
        existing_sub.plan_type = new_plan_type
        existing_sub.ls_variant_id = new_variant_id
        existing_sub.save()
        
        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        profile.role = 'data_analyst'
        profile.save()
        
        user.role = User.Role.DATA_ANALYST
        user.save()
    except Exception as e:
        raise RuntimeError(f"Failed to upgrade subscription immediately: {e}") from e

def consolidate_report_subscriptions(user: Any) -> None:
    """
    Atomically cancels all active individual report subscriptions via Lemon Squeezy API.
    """
    reports_plan_types = ['report_single_egypt', 'report_single_dubai', 'report_single_england']
    
    active_subs = Subscription.objects.filter(
        user=user, 
        plan_type__in=reports_plan_types, 
        status__in=['active', 'trialing']
    )
    
    for sub in active_subs:
        url = f"https://api.lemonsqueezy.com/v1/subscriptions/{sub.ls_subscription_id}"
        response = requests.delete(url, headers=get_ls_headers())
        response.raise_for_status()
        sub.status = 'canceled'
        sub.cancel_at_period_end = False
        sub.save()

def cancel_subscription_immediately(user: Any, plan_type: str) -> bool:
    """
    Executes the Hard Reset logic. Instantly kills the subscription in Lemon Squeezy.
    Drops the specific subscription flag and correctly resets the storage/role.
    """
    try:
        active_sub = Subscription.objects.get(
            user=user,
            plan_type=plan_type,
            status__in=['active', 'trialing'],
        )

        url = f"https://api.lemonsqueezy.com/v1/subscriptions/{active_sub.ls_subscription_id}"
        response = requests.delete(url, headers=get_ls_headers())
        response.raise_for_status()

        active_sub.status = 'canceled'
        active_sub.cancel_at_period_end = False
        active_sub.save()

        # Recalculate user role and storage options
        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        
        has_role_sub = Subscription.objects.filter(
            user=user,
            plan_type__in=['analyst', 'analyst_pro_max'],
            status__in=['active', 'trialing']
        ).exclude(id=active_sub.id).exists()

        if not has_role_sub:
            profile.role = 'user'
            profile.save()
            user.role = User.Role.USER
            user.save()

        return True
    except Subscription.DoesNotExist:
        raise ValueError("No active subscription found for this plan type.")
    except Exception as e:
        raise RuntimeError(f"Failed to cancel subscription: {e}") from e