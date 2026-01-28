from django.contrib import admin
from .models import Zone, ZoneDistanceRange, ZonePricing, Route, VehicleRoutePricing


class ZoneDistanceRangeInline(admin.TabularInline):
    model = ZoneDistanceRange
    extra = 1


class VehicleRoutePricingInline(admin.TabularInline):
    model = VehicleRoutePricing
    extra = 1
    autocomplete_fields = ['vehicle']


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ('name', 'center_latitude', 'center_longitude', 'radius_km', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ZoneDistanceRangeInline]


@admin.register(ZoneDistanceRange)
class ZoneDistanceRangeAdmin(admin.ModelAdmin):
    list_display = ('zone', 'name', 'min_km', 'max_km', 'is_active')
    list_filter = ('zone', 'is_active')
    search_fields = ('name', 'zone__name')
    autocomplete_fields = ['zone']


@admin.register(ZonePricing)
class ZonePricingAdmin(admin.ModelAdmin):
    list_display = ('from_zone', 'to_zone', 'vehicle_category', 'price', 'is_active')
    list_filter = ('from_zone', 'to_zone', 'is_active')
    raw_id_fields = ('from_zone', 'to_zone', 'vehicle_category')


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('name', 'origin_name', 'destination_name', 'distance_km', 'is_bidirectional', 'is_popular', 'is_active', 'order')
    list_filter = ('is_active', 'is_popular', 'is_bidirectional')
    search_fields = ('name', 'origin_name', 'destination_name')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('order', 'name')
    inlines = [VehicleRoutePricingInline]
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'description')
        }),
        ('Origin', {
            'fields': ('origin_name', ('origin_latitude', 'origin_longitude'), 'origin_radius_km')
        }),
        ('Destination', {
            'fields': ('destination_name', ('destination_latitude', 'destination_longitude'), 'destination_radius_km')
        }),
        ('Distance & Time', {
            'fields': ('distance_km', 'estimated_duration_minutes')
        }),
        ('Settings', {
            'fields': ('is_bidirectional', 'is_active', 'is_popular', 'order')
        }),
    )


@admin.register(VehicleRoutePricing)
class VehicleRoutePricingAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'route', 'price', 'is_active')
    list_filter = ('route', 'is_active')
    search_fields = ('vehicle__name', 'route__name')
    autocomplete_fields = ['vehicle', 'route']
