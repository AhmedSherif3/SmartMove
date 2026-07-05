from django.contrib import admin

from .models import CurrencyRate


@admin.register(CurrencyRate)
class CurrencyRateAdmin(admin.ModelAdmin):
    list_display = ('currency_code', 'rate_to_usd', 'last_updated')
    search_fields = ('currency_code',)
    ordering = ('currency_code',)
    readonly_fields = ('last_updated',)
