from django.contrib import admin
from .models import Transfer, TransferExtra, TransferExtraBooking


class TransferExtraBookingInline(admin.TabularInline):
    model = TransferExtraBooking
    extra = 0
    raw_id_fields = ('extra',)


@admin.register(Transfer)
class TransferAdmin(admin.ModelAdmin):
    list_display = (
        'booking_ref', 'customer_name', 'pickup_address', 'dropoff_address',
        'pickup_datetime', 'status', 'total_price', 'created_at'
    )
    list_filter = ('status', 'transfer_type', 'vehicle_category', 'is_round_trip', 'created_at')
    search_fields = (
        'booking_ref', 'customer_name', 'customer_email', 'customer_phone',
        'flight_number', 'pickup_address', 'dropoff_address'
    )
    raw_id_fields = ('customer', 'vehicle', 'driver')
    readonly_fields = ('booking_ref', 'created_at', 'updated_at')
    date_hierarchy = 'pickup_datetime'
    inlines = [TransferExtraBookingInline]

    fieldsets = (
        ('Booking Info', {
            'fields': ('booking_ref', 'status', 'transfer_type')
        }),
        ('Customer', {
            'fields': ('customer', 'customer_name', 'customer_email', 'customer_phone')
        }),
        ('Pickup Location', {
            'fields': (
                'pickup_address', 'pickup_latitude', 'pickup_longitude'
            )
        }),
        ('Drop-off Location', {
            'fields': (
                'dropoff_address', 'dropoff_latitude', 'dropoff_longitude'
            )
        }),
        ('Transfer Details', {
            'fields': (
                'pickup_datetime', 'passengers', 'luggage', 'child_seats',
                'distance_km', 'duration_minutes'
            )
        }),
        ('Flight Info', {
            'fields': ('flight_number', 'flight_arrival_time'),
            'classes': ('collapse',)
        }),
        ('Vehicle & Driver', {
            'fields': ('vehicle_category', 'vehicle', 'driver')
        }),
        ('Pricing', {
            'fields': ('base_price', 'extras_price', 'discount', 'total_price', 'currency')
        }),
        ('Round Trip', {
            'fields': ('is_round_trip', 'return_datetime', 'return_transfer'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('special_requests', 'internal_notes'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TransferExtra)
class TransferExtraAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'is_per_item', 'is_active')
    list_filter = ('is_active', 'is_per_item')
    search_fields = ('name',)


@admin.register(TransferExtraBooking)
class TransferExtraBookingAdmin(admin.ModelAdmin):
    list_display = ('transfer', 'extra', 'quantity', 'price')
    raw_id_fields = ('transfer', 'extra')
