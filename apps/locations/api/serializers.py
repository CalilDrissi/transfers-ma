from rest_framework import serializers
from apps.locations.models import (
    Zone, ZoneDistanceRange, ZonePricing, Route, VehicleRoutePricing,
    RoutePickupZone, RouteDropoffZone
)


class ZoneDistanceRangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZoneDistanceRange
        fields = ['id', 'name', 'min_km', 'max_km', 'is_active']


class ZoneSerializer(serializers.ModelSerializer):
    distance_ranges = ZoneDistanceRangeSerializer(many=True, read_only=True)

    class Meta:
        model = Zone
        fields = [
            'id', 'name', 'slug', 'description', 'color',
            'center_latitude', 'center_longitude', 'radius_km',
            'is_active', 'client_notice', 'client_notice_type',
            'pickup_instructions', 'area_description', 'display_order',
            'custom_info', 'distance_ranges'
        ]


class ZoneListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views."""
    class Meta:
        model = Zone
        fields = ['id', 'name', 'slug', 'color', 'is_active']


class ZonePricingSerializer(serializers.ModelSerializer):
    from_zone = ZoneListSerializer(read_only=True)
    to_zone = ZoneListSerializer(read_only=True)
    from_zone_id = serializers.PrimaryKeyRelatedField(
        queryset=Zone.objects.all(),
        source='from_zone',
        write_only=True
    )
    to_zone_id = serializers.PrimaryKeyRelatedField(
        queryset=Zone.objects.all(),
        source='to_zone',
        write_only=True
    )

    class Meta:
        model = ZonePricing
        fields = [
            'id', 'from_zone', 'to_zone', 'from_zone_id', 'to_zone_id',
            'vehicle_category', 'price', 'is_active'
        ]


class RoutePickupZoneSerializer(serializers.ModelSerializer):
    """Serializer for route pickup zones."""
    class Meta:
        model = RoutePickupZone
        fields = [
            'id', 'name', 'center_latitude', 'center_longitude',
            'radius_km', 'color', 'price_adjustment', 'order', 'is_active'
        ]


class RouteDropoffZoneSerializer(serializers.ModelSerializer):
    """Serializer for route dropoff zones."""
    class Meta:
        model = RouteDropoffZone
        fields = [
            'id', 'name', 'center_latitude', 'center_longitude',
            'radius_km', 'color', 'price_adjustment', 'order', 'is_active'
        ]


class VehicleRoutePricingSerializer(serializers.ModelSerializer):
    """Serializer for vehicle pricing on a route, with optional zone info."""
    vehicle_name = serializers.CharField(source='vehicle.name', read_only=True)
    vehicle_category = serializers.CharField(source='vehicle.category.name', read_only=True)
    passengers = serializers.IntegerField(source='vehicle.passengers', read_only=True)
    luggage = serializers.IntegerField(source='vehicle.luggage', read_only=True)
    pickup_zone_name = serializers.CharField(source='pickup_zone.name', read_only=True, allow_null=True)
    dropoff_zone_name = serializers.CharField(source='dropoff_zone.name', read_only=True, allow_null=True)
    is_zone_specific = serializers.BooleanField(read_only=True)

    class Meta:
        model = VehicleRoutePricing
        fields = [
            'id', 'vehicle', 'vehicle_name', 'vehicle_category',
            'passengers', 'luggage',
            'pickup_zone', 'pickup_zone_name',
            'dropoff_zone', 'dropoff_zone_name',
            'is_zone_specific', 'price', 'is_active'
        ]


class RouteListSerializer(serializers.ModelSerializer):
    """Simplified serializer for route list views."""
    duration_display = serializers.CharField(source='estimated_duration_display', read_only=True)

    class Meta:
        model = Route
        fields = [
            'id', 'name', 'slug', 'origin_name', 'destination_name',
            'distance_km', 'estimated_duration_minutes', 'duration_display',
            'is_bidirectional', 'is_popular'
        ]


class RouteDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for route with zones and pricing information."""
    duration_display = serializers.CharField(source='estimated_duration_display', read_only=True)
    pickup_zones = RoutePickupZoneSerializer(many=True, read_only=True)
    dropoff_zones = RouteDropoffZoneSerializer(many=True, read_only=True)
    vehicle_pricing = VehicleRoutePricingSerializer(many=True, read_only=True)
    has_zones = serializers.BooleanField(read_only=True)

    class Meta:
        model = Route
        fields = [
            'id', 'name', 'slug', 'description',
            'origin_name', 'origin_latitude', 'origin_longitude', 'origin_radius_km',
            'destination_name', 'destination_latitude', 'destination_longitude', 'destination_radius_km',
            'distance_km', 'estimated_duration_minutes', 'duration_display',
            'is_bidirectional', 'is_popular',
            'client_notice', 'client_notice_type', 'route_description',
            'highlights', 'travel_tips', 'estimated_traffic_info',
            'included_amenities', 'cancellation_policy_override',
            'custom_info',
            'has_zones', 'pickup_zones', 'dropoff_zones',
            'vehicle_pricing'
        ]


class RouteSearchSerializer(serializers.Serializer):
    """Serializer for searching routes by coordinates."""
    origin_lat = serializers.DecimalField(max_digits=10, decimal_places=7, required=True)
    origin_lng = serializers.DecimalField(max_digits=10, decimal_places=7, required=True)
    destination_lat = serializers.DecimalField(max_digits=10, decimal_places=7, required=True)
    destination_lng = serializers.DecimalField(max_digits=10, decimal_places=7, required=True)


class RouteWithPricingSerializer(serializers.ModelSerializer):
    """Route with all vehicle pricing options."""
    duration_display = serializers.CharField(source='estimated_duration_display', read_only=True)
    vehicle_options = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = [
            'id', 'name', 'slug', 'description', 'custom_info', 'deposit_percentage',
            'origin_name', 'origin_latitude', 'origin_longitude',
            'destination_name', 'destination_latitude', 'destination_longitude',
            'distance_km', 'estimated_duration_minutes', 'duration_display',
            'is_bidirectional',
            'client_notice', 'client_notice_type', 'route_description',
            'highlights', 'travel_tips', 'estimated_traffic_info',
            'included_amenities', 'cancellation_policy_override',
            'vehicle_options'
        ]

    def get_vehicle_options(self, obj):
        """Get all vehicle options with prices for this route.

        Uses default route pricing + per-vehicle sub-zone price adjustments.
        Final price = default_price + pickup_adjustment + dropoff_adjustment.
        Adjustments are stored as JSON on each VehicleRoutePricing record.
        """
        from apps.vehicles.models import VehicleCategory

        matched_pickup_zone = self.context.get('matched_pickup_zone')
        matched_dropoff_zone = self.context.get('matched_dropoff_zone')

        options = []

        # Always use default route pricing (no zone FKs)
        default_pricing = obj.vehicle_pricing.filter(
            is_active=True,
            pickup_zone__isnull=True,
            dropoff_zone__isnull=True
        ).select_related('vehicle', 'vehicle__category')

        for pricing in default_pricing:
            # Per-vehicle adjustments from JSON fields
            pickup_adj = 0
            dropoff_adj = 0
            if matched_pickup_zone:
                pickup_adj = float(pricing.pickup_zone_adjustments.get(str(matched_pickup_zone.id), 0))
            if matched_dropoff_zone:
                dropoff_adj = float(pricing.dropoff_zone_adjustments.get(str(matched_dropoff_zone.id), 0))
            adjusted_price = float(pricing.price) + pickup_adj + dropoff_adj
            options.append(self._build_vehicle_option(
                pricing.vehicle, adjusted_price, 'route', pricing
            ))

        return sorted(options, key=lambda x: x['price'])

    def _build_vehicle_option(self, vehicle, price, pricing_type, pricing=None):
        """Build a vehicle option dict with image and custom_info."""
        primary_image = vehicle.images.filter(is_primary=True).first()
        image_url = primary_image.image.url if primary_image else None
        category = vehicle.category
        return {
            'vehicle_id': vehicle.id,
            'vehicle_name': vehicle.name,
            'category_id': category.id,
            'category_name': category.name,
            'category_icon': category.icon,
            'category_description': category.description or '',
            'category_tagline': category.tagline or '',
            'category_included_amenities': category.included_amenities or [],
            'category_not_included': category.not_included or [],
            'category_image': category.image.url if category.image else None,
            'passengers': vehicle.passengers,
            'luggage': vehicle.luggage,
            'price': float(price),
            'features': [f.name for f in vehicle.features.all()[:4]],
            'image': image_url,
            'client_description': vehicle.client_description or '',
            'key_features': vehicle.key_features or [],
            'important_note': vehicle.important_note or '',
            'important_note_type': vehicle.important_note_type or 'info',
            'custom_info': vehicle.custom_info or {},
            'pricing_type': pricing_type,
            'min_booking_hours': pricing.min_booking_hours if pricing else None
        }
