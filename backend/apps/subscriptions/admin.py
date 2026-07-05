# admin.py
from django.contrib import admin
from .models import CustomerProfile, Subscription

@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'additional_storage_gb', 'get_total_storage_allowance')
    search_fields = ('user__email', 'ls_customer_id')
    list_filter = ('role',)
    
@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan_type', 'status', 'current_period_end', 'cancel_at_period_end')
    search_fields = ('user__email', 'ls_subscription_id')
    list_filter = ('status', 'plan_type')
    readonly_fields = ('created_at', 'updated_at')
