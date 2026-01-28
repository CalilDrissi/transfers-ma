from django.contrib import admin
from .models import Rental, RentalExtra, RentalExtraBooking, InsuranceOption


class RentalExtraBookingInline(admin.TabularInline):
    model = RentalExtraBooking
    extra = 0
    raw_id_fields = ('extra',)


@admin.register(Rental)
class RentalAdmin(admin.ModelAdmin):
    list_display = (
        'booking_ref', 'customer_name', 'vehicle', 'pickup_datetime',
        'return_datetime', 'total_days', 'status', 'total_price', 'created_at'
    )
    list_filter = ('status', 'insurance_type', 'created_at')
    search_fields = (
        'booking_ref', 'customer_name', 'customer_email',
        'customer_phone', 'driver_license_number',
        'pickup_location', 'return_location'
    )
    raw_id_fields = ('customer', 'vehicle')
    readonly_fields = ('booking_ref', 'created_at', 'updated_at')
    date_hierarchy = 'pickup_datetime'
    inlines = [RentalExtraBookingInline]

    fieldsets = (
        ('Booking Info', {
            'fields': ('booking_ref', 'status', 'vehicle')
        }),
        ('Customer', {
            'fields': ('customer', 'customer_name', 'customer_email', 'customer_phone')
        }),
        ('Driver Info', {
            'fields': ('driver_license_number', 'driver_license_expiry', 'driver_date_of_birth')
        }),
        ('Rental Period', {
            'fields': ('pickup_datetime', 'return_datetime', 'total_days')
        }),
        ('Locations', {
            'fields': ('pickup_location', 'return_location')
        }),
        ('Insurance', {
            'fields': ('insurance_type', 'insurance_cost')
        }),
        ('Pricing', {
            'fields': (
                'daily_rate', 'subtotal', 'extras_cost',
                'different_location_fee', 'discount', 'total_price', 'deposit', 'currency'
            )
        }),
        ('Actual Pickup/Return', {
            'fields': (
                'actual_pickup_datetime', 'actual_return_datetime',
                'pickup_mileage', 'return_mileage',
                'fuel_level_pickup', 'fuel_level_return'
            ),
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


@admin.register(RentalExtra)
class RentalExtraAdmin(admin.ModelAdmin):
    list_display = ('name', 'daily_price', 'max_price', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)


@admin.register(RentalExtraBooking)
class RentalExtraBookingAdmin(admin.ModelAdmin):
    list_display = ('rental', 'extra', 'quantity', 'price')
    raw_id_fields = ('rental', 'extra')


@admin.register(InsuranceOption)
class InsuranceOptionAdmin(admin.ModelAdmin):
    list_display = ('name', 'insurance_type', 'daily_price', 'deductible', 'is_active')
    list_filter = ('is_active',)
