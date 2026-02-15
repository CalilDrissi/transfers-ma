from rest_framework import serializers
from apps.vehicles.models import VehicleCategory, VehicleFeature, Vehicle, VehicleImage, VehicleZonePricing


class VehicleFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleFeature
        fields = ['id', 'name', 'icon']


class VehicleZonePricingSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source='zone_distance_range.zone.name', read_only=True)
    range_name = serializers.CharField(source='zone_distance_range.name', read_only=True)
    min_km = serializers.DecimalField(
        source='zone_distance_range.min_km',
        max_digits=8,
        decimal_places=2,
        read_only=True
    )
    max_km = serializers.DecimalField(
        source='zone_distance_range.max_km',
        max_digits=8,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = VehicleZonePricing
        fields = [
            'id', 'zone_distance_range', 'zone_name', 'range_name',
            'min_km', 'max_km', 'price', 'is_active'
        ]


class VehicleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleCategory
        fields = [
            'id', 'name', 'slug', 'description', 'max_passengers',
            'max_luggage', 'price_multiplier', 'icon', 'image', 'order'
        ]


class VehicleCategoryListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views without pricing details."""

    class Meta:
        model = VehicleCategory
        fields = [
            'id', 'name', 'slug', 'description', 'max_passengers',
            'max_luggage', 'price_multiplier', 'icon', 'image', 'order'
        ]


class VehicleImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleImage
        fields = ['id', 'image', 'caption', 'is_primary', 'order']


class VehicleSerializer(serializers.ModelSerializer):
    category = VehicleCategoryListSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=VehicleCategory.objects.all(),
        source='category',
        write_only=True
    )
    features = VehicleFeatureSerializer(many=True, read_only=True)
    feature_ids = serializers.PrimaryKeyRelatedField(
        queryset=VehicleFeature.objects.all(),
        source='features',
        many=True,
        write_only=True,
        required=False
    )
    images = VehicleImageSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    zone_pricing = VehicleZonePricingSerializer(many=True, read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'category', 'category_id', 'name', 'license_plate',
            'year', 'color', 'passengers', 'luggage', 'features', 'feature_ids',
            'status', 'notes', 'custom_info', 'is_active', 'daily_rate', 'weekly_rate',
            'is_available_for_rental', 'images', 'primary_image', 'zone_pricing'
        ]

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            return VehicleImageSerializer(primary).data
        return None


class VehicleListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'name', 'category_name', 'license_plate',
            'passengers', 'luggage', 'status', 'primary_image',
            'daily_rate', 'is_available_for_rental'
        ]

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            return primary.image.url
        return None
