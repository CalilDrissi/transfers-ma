from django.contrib import admin
from .models import VehicleCategory, VehicleFeature, Vehicle, VehicleImage, VehicleZonePricing


class VehicleImageInline(admin.TabularInline):
    model = VehicleImage
    extra = 1


class VehicleZonePricingInline(admin.TabularInline):
    model = VehicleZonePricing
    extra = 1
    autocomplete_fields = ['zone_distance_range']


@admin.register(VehicleCategory)
class VehicleCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'max_passengers', 'max_luggage', 'price_multiplier', 'order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('order', 'name')


@admin.register(VehicleFeature)
class VehicleFeatureAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'category', 'passengers',
        'status', 'service_type', 'is_active'
    )
    list_filter = ('category', 'status', 'is_active', 'service_type')
    search_fields = ('name',)
    exclude = ('license_plate', 'year', 'color', 'features')
    inlines = [VehicleImageInline, VehicleZonePricingInline]


@admin.register(VehicleImage)
class VehicleImageAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'caption', 'is_primary', 'order')
    list_filter = ('is_primary', 'vehicle__category')
    search_fields = ('vehicle__name', 'caption')
    raw_id_fields = ('vehicle',)


@admin.register(VehicleZonePricing)
class VehicleZonePricingAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'zone_distance_range', 'price', 'is_active')
    list_filter = ('vehicle', 'zone_distance_range__zone', 'is_active')
    search_fields = ('vehicle__name', 'zone_distance_range__name')
    autocomplete_fields = ['vehicle', 'zone_distance_range']
