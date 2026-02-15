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
            'is_active', 'custom_info', 'distance_ranges'
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
            'radius_km', 'color', 'order', 'is_active'
        ]


class RouteDropoffZoneSerializer(serializers.ModelSerializer):
    """Serializer for route dropoff zones."""
    class Meta:
        model = RouteDropoffZone
        fields = [
            'id', 'name', 'center_latitude', 'center_longitude',
            'radius_km', 'color', 'order', 'is_active'
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
            'is_bidirectional', 'is_popular', 'custom_info',
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
            'is_bidirectional', 'vehicle_options'
        ]

    def get_vehicle_options(self, obj):
        """Get all vehicle options with prices for this route.

        If matched_pickup_zone and/or matched_dropoff_zone are passed in context,
        it will return zone-specific pricing when available.
        """
        from apps.vehicles.models import VehicleCategory

        # Get matched zones from context if available
        matched_pickup_zone = self.context.get('matched_pickup_zone')
        matched_dropoff_zone = self.context.get('matched_dropoff_zone')

        options = []
        vehicles_seen = set()

        # If we have matched zones, prioritize zone-specific pricing
        if matched_pickup_zone or matched_dropoff_zone:
            # First, try to find exact zone match pricing
            zone_pricing = obj.vehicle_pricing.filter(
                is_active=True,
                pickup_zone=matched_pickup_zone,
                dropoff_zone=matched_dropoff_zone
            ).select_related('vehicle', 'vehicle__category')

            for pricing in zone_pricing:
                vehicle = pricing.vehicle
                if vehicle.id not in vehicles_seen:
                    vehicles_seen.add(vehicle.id)
                    options.append(self._build_vehicle_option(vehicle, pricing.price, 'zone_specific'))

            # If no exact match, try pickup zone only
            if not options and matched_pickup_zone:
                pickup_pricing = obj.vehicle_pricing.filter(
                    is_active=True,
                    pickup_zone=matched_pickup_zone,
                    dropoff_zone__isnull=True
                ).select_related('vehicle', 'vehicle__category')

                for pricing in pickup_pricing:
                    vehicle = pricing.vehicle
                    if vehicle.id not in vehicles_seen:
                        vehicles_seen.add(vehicle.id)
                        options.append(self._build_vehicle_option(vehicle, pricing.price, 'pickup_zone'))

            # If still no match, try dropoff zone only
            if not options and matched_dropoff_zone:
                dropoff_pricing = obj.vehicle_pricing.filter(
                    is_active=True,
                    pickup_zone__isnull=True,
                    dropoff_zone=matched_dropoff_zone
                ).select_related('vehicle', 'vehicle__category')

                for pricing in dropoff_pricing:
                    vehicle = pricing.vehicle
                    if vehicle.id not in vehicles_seen:
                        vehicles_seen.add(vehicle.id)
                        options.append(self._build_vehicle_option(vehicle, pricing.price, 'dropoff_zone'))

        # Fall back to default route pricing (no zones)
        if not options:
            default_pricing = obj.vehicle_pricing.filter(
                is_active=True,
                pickup_zone__isnull=True,
                dropoff_zone__isnull=True
            ).select_related('vehicle', 'vehicle__category')

            for pricing in default_pricing:
                vehicle = pricing.vehicle
                if vehicle.id not in vehicles_seen:
                    vehicles_seen.add(vehicle.id)
                    options.append(self._build_vehicle_option(vehicle, pricing.price, 'route_default'))

        # If still no route-specific pricing, fall back to category-based pricing
        if not options:
            for category in VehicleCategory.objects.filter(is_active=True).order_by('order'):
                base_price = float(obj.distance_km) * 5 * float(category.price_multiplier)
                options.append({
                    'vehicle_id': None,
                    'vehicle_name': category.name,
                    'category_id': category.id,
                    'category_name': category.name,
                    'category_icon': category.icon,
                    'category_description': category.description or '',
                    'category_image': category.image.url if category.image else None,
                    'passengers': category.max_passengers,
                    'luggage': category.max_luggage,
                    'price': max(base_price, 100),
                    'features': [],
                    'image': category.image.url if category.image else None,
                    'custom_info': {},
                    'pricing_type': 'calculated'
                })

        return sorted(options, key=lambda x: x['price'])

    def _build_vehicle_option(self, vehicle, price, pricing_type):
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
            'category_image': category.image.url if category.image else None,
            'passengers': vehicle.passengers,
            'luggage': vehicle.luggage,
            'price': float(price),
            'features': [f.name for f in vehicle.features.all()[:4]],
            'image': image_url,
            'custom_info': vehicle.custom_info or {},
            'pricing_type': pricing_type
        }
