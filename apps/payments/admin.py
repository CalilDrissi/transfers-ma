from django.contrib import admin
from .models import PaymentGateway, Payment, Refund, Invoice


@admin.register(PaymentGateway)
class PaymentGatewayAdmin(admin.ModelAdmin):
    list_display = ('name', 'gateway_type', 'is_active', 'is_test_mode', 'order')
    list_filter = ('is_active', 'is_test_mode', 'gateway_type')
    search_fields = ('name', 'display_name')
    ordering = ('order', 'name')


class RefundInline(admin.TabularInline):
    model = Refund
    extra = 0
    readonly_fields = ('refund_ref', 'gateway_refund_id', 'created_at', 'completed_at')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'payment_ref', 'payment_type', 'customer_email', 'gateway',
        'amount', 'currency', 'status', 'created_at'
    )
    list_filter = ('status', 'payment_type', 'gateway', 'created_at')
    search_fields = ('payment_ref', 'customer_email', 'gateway_payment_id')
    raw_id_fields = ('customer',)
    readonly_fields = ('payment_ref', 'created_at', 'updated_at', 'completed_at')
    date_hierarchy = 'created_at'
    inlines = [RefundInline]

    fieldsets = (
        ('Payment Info', {
            'fields': ('payment_ref', 'payment_type', 'status')
        }),
        ('Booking', {
            'fields': ('content_type', 'object_id')
        }),
        ('Customer', {
            'fields': ('customer', 'customer_email')
        }),
        ('Gateway', {
            'fields': ('gateway', 'gateway_payment_id', 'gateway_customer_id')
        }),
        ('Amount', {
            'fields': ('amount', 'currency', 'refunded_amount')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Error', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ('refund_ref', 'payment', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('refund_ref', 'payment__payment_ref', 'gateway_refund_id')
    raw_id_fields = ('payment', 'processed_by')
    readonly_fields = ('refund_ref', 'created_at', 'completed_at')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'customer_name', 'total', 'currency', 'status', 'issue_date')
    list_filter = ('status', 'issue_date')
    search_fields = ('invoice_number', 'customer_name', 'customer_email')
    raw_id_fields = ('payment',)
    readonly_fields = ('invoice_number', 'created_at', 'updated_at')

    fieldsets = (
        ('Invoice Info', {
            'fields': ('invoice_number', 'payment', 'status')
        }),
        ('Customer', {
            'fields': ('customer_name', 'customer_email', 'customer_address')
        }),
        ('Amount', {
            'fields': ('subtotal', 'tax_rate', 'tax_amount', 'total', 'currency')
        }),
        ('Line Items', {
            'fields': ('line_items',),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('issue_date', 'due_date', 'paid_date')
        }),
        ('Notes & PDF', {
            'fields': ('notes', 'pdf_file'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
