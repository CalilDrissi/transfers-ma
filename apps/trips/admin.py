from django.contrib import admin
from .models import Trip, TripImage, TripSchedule, TripBooking


class TripImageInline(admin.TabularInline):
    model = TripImage
    extra = 1


class TripScheduleInline(admin.TabularInline):
    model = TripSchedule
    extra = 1


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'trip_type', 'departure_location', 'duration_days',
        'price_per_person', 'is_featured', 'is_active', 'order'
    )
    list_filter = ('trip_type', 'is_active', 'is_featured')
    search_fields = ('name', 'description', 'departure_location', 'destinations')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [TripImageInline, TripScheduleInline]
    ordering = ('order', 'name')

    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'slug', 'short_description', 'description', 'trip_type')
        }),
        ('Location', {
            'fields': ('departure_location', 'destinations')
        }),
        ('Duration & Capacity', {
            'fields': ('duration_hours', 'duration_days', 'min_participants', 'max_participants')
        }),
        ('Pricing', {
            'fields': ('price_per_person', 'child_price', 'private_tour_price', 'currency')
        }),
        ('Details', {
            'fields': ('inclusions', 'exclusions', 'itinerary')
        }),
        ('Media', {
            'fields': ('featured_image',)
        }),
        ('Settings', {
            'fields': ('is_active', 'is_featured', 'order')
        }),
    )


@admin.register(TripImage)
class TripImageAdmin(admin.ModelAdmin):
    list_display = ('trip', 'caption', 'order')
    list_filter = ('trip',)
    raw_id_fields = ('trip',)


@admin.register(TripSchedule)
class TripScheduleAdmin(admin.ModelAdmin):
    list_display = ('trip', 'specific_date', 'day_of_week', 'departure_time', 'available_spots', 'is_active')
    list_filter = ('trip', 'day_of_week', 'is_active')
    raw_id_fields = ('trip',)


@admin.register(TripBooking)
class TripBookingAdmin(admin.ModelAdmin):
    list_display = (
        'booking_ref', 'trip', 'customer_name', 'trip_date',
        'adults', 'children', 'status', 'total_price', 'created_at'
    )
    list_filter = ('status', 'trip', 'is_private', 'created_at')
    search_fields = ('booking_ref', 'customer_name', 'customer_email', 'customer_phone')
    raw_id_fields = ('trip', 'schedule', 'customer')
    readonly_fields = ('booking_ref', 'created_at', 'updated_at')
    date_hierarchy = 'trip_date'

    fieldsets = (
        ('Booking Info', {
            'fields': ('booking_ref', 'status', 'trip', 'schedule', 'trip_date')
        }),
        ('Customer', {
            'fields': ('customer', 'customer_name', 'customer_email', 'customer_phone')
        }),
        ('Participants', {
            'fields': ('adults', 'children', 'is_private')
        }),
        ('Pickup', {
            'fields': ('pickup_address',)
        }),
        ('Pricing', {
            'fields': ('price_per_adult', 'price_per_child', 'extras_price', 'discount', 'total_price', 'currency')
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
