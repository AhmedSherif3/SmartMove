from __future__ import annotations
from django.db import models
from django.contrib.auth import get_user_model
from django.db.models import Manager

# Fetch user model dynamically
User = get_user_model()

class CustomerProfile(models.Model):
    """
    Master profile linking a Django user to their Stripe identity and core system tier.
    """
    ROLE_CHOICES = [
        ('user', 'User (Free)'),
        ('data_analyst', 'Data Analyst (Premium)'),
    ]
    
    # Explicit Type Annotations for Static Type Checkers
    objects: Manager[CustomerProfile] = Manager()
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='ls_profile')
    ls_customer_id = models.CharField(max_length=255, unique=True, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    additional_storage_gb = models.IntegerField(default=0)

    def get_total_storage_allowance(self) -> int:
        """
        Executes the Storage Math for MinIO policy enforcement:
        [Base] + [Additional Storage Subscriptions] = Total GB, capped at 10 GB.
        If the user has an active analyst_pro_max subscription, it is 10 GB.
        """
        has_pro_max = self.user.subscriptions.filter(
            plan_type='analyst_pro_max',
            status__in=['active', 'trialing']
        ).exists()
        if has_pro_max:
            return 10
            
        base_storage = 5 if self.role == 'data_analyst' else 1
        
        # Check active storage subscriptions
        storage_subs = self.user.subscriptions.filter(
            plan_type__in=['storage_per_gb', 'storage_5gb', 'storage_9gb'],
            status__in=['active', 'trialing']
        )
        
        extra_storage = 0
        for sub in storage_subs:
            if sub.plan_type == 'storage_per_gb':
                extra_storage += sub.quantity
            elif sub.plan_type == 'storage_5gb':
                extra_storage += 5
            elif sub.plan_type == 'storage_9gb':
                extra_storage += 9
                
        return min(base_storage + extra_storage, 10)

    def __str__(self) -> str:
        return f"{self.user.email} | {self.get_display_role()} | {self.get_total_storage_allowance()}GB Total"  # type: ignore[attr-defined]

    def get_display_role(self) -> str:
        return dict(self.ROLE_CHOICES).get(self.role, 'Unknown')


class Subscription(models.Model):
    """
    Tracks individual recurring items from Stripe. A user can have multiple active records here.
    """
    PLAN_CHOICES = [
        ('analyst', 'Analyst Plan'),
        ('analyst_pro_max', 'Analyst Pro Max Plan'),
        ('storage_per_gb', 'Storage Per GB'),
        ('storage_5gb', 'Storage 5GB Bundle'),
        ('storage_9gb', 'Storage 9GB Bundle'),
        ('report_single_egypt', 'Egypt Report Mailing'),
        ('report_single_dubai', 'Dubai Report Mailing'),
        ('report_single_england', 'England Report Mailing'),
        ('report_all', 'All Regions Report Bundle'),
    ]

    # Explicit Type Annotations for Static Type Checkers
    objects: Manager[Subscription] = Manager()
    DoesNotExist: type[Exception]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    ls_subscription_id = models.CharField(max_length=255, unique=True)
    ls_variant_id = models.CharField(max_length=255)
    plan_type = models.CharField(max_length=50, choices=PLAN_CHOICES)
    quantity = models.IntegerField(default=1)
    status = models.CharField(max_length=50)  # active, trialing, canceled, past_due, incomplete
    current_period_end = models.DateTimeField()
    cancel_at_period_end = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['plan_type', 'status']),
        ]

    def is_active(self) -> bool:
        """Helper to quickly check if this specific record grants access."""
        return self.status in ['active', 'trialing']

    def __str__(self) -> str:
        return f"{self.user.email} - {self.get_plan_type_display()} ({self.status})"  # type: ignore[attr-defined]