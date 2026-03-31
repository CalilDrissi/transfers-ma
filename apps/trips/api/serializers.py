from rest_framework import serializers
from apps.trips.models import (
    Trip, TripImage, TripSchedule, TripBooking,
    TripHighlight, TripItineraryStop, TripFAQ,
    TripContentBlock, TripPriceTier
)


class TripImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripImage
        fields = ['id', 'image', 'caption', 'order']


class TripScheduleSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = TripSchedule
        fields = [
            'id', 'specific_date', 'day_of_week', 'day_name',
            'departure_time', 'available_spots', 'is_active'
        ]


class TripHighlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripHighlight
        fields = ['id', 'icon', 'text', 'order']


class TripItineraryStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripItineraryStop
        fields = [
            'id', 'stop_type', 'name', 'location', 'description',
            'duration_minutes', 'has_admission', 'order'
        ]


class TripFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripFAQ
        fields = ['id', 'question', 'answer', 'order']


class TripContentBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripContentBlock
        fields = ['id', 'title', 'content', 'order']


class TripPriceTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripPriceTier
        fields = ['id', 'min_persons', 'max_persons', 'private_price', 'shared_price', 'order']


class TripSerializer(serializers.ModelSerializer):
    images = TripImageSerializer(many=True, read_only=True)
    schedules = TripScheduleSerializer(many=True, read_only=True)
    highlights = TripHighlightSerializer(many=True, read_only=True)
    itinerary_stops = TripItineraryStopSerializer(many=True, read_only=True)
    faqs = TripFAQSerializer(many=True, read_only=True)
    content_blocks = TripContentBlockSerializer(many=True, read_only=True)
    price_tiers = TripPriceTierSerializer(many=True, read_only=True)
    inclusions_list = serializers.ListField(read_only=True)
    exclusions_list = serializers.ListField(read_only=True)
    destinations_list = serializers.ListField(read_only=True)

    class Meta:
        model = Trip
        fields = [
            'id', 'name', 'slug', 'description', 'short_description',
            'trip_type', 'service_type', 'departure_location',
            'destinations', 'destinations_list', 'driver_languages',
            'duration_hours', 'duration_days', 'min_participants', 'max_participants',
            'pricing_model', 'price_per_person', 'child_price',
            'private_tour_price', 'currency',
            'inclusions', 'exclusions', 'inclusions_list', 'exclusions_list',
            'cancellation_policy', 'booking_notice_hours', 'instant_confirmation',
            'child_policy', 'accessibility_info',
            'featured_image', 'images', 'schedules',
            'highlights', 'itinerary_stops', 'faqs',
            'content_blocks', 'price_tiers',
            'is_featured', 'order',
        ]


class TripListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views."""
    starting_price = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            'id', 'name', 'slug', 'short_description', 'trip_type',
            'departure_location', 'duration_days', 'duration_hours',
            'price_per_person', 'starting_price', 'currency', 'featured_image', 'is_featured'
        ]

    def get_starting_price(self, obj):
        tier = obj.price_tiers.order_by('shared_price').first()
        if tier:
            return str(min(tier.shared_price, tier.private_price))
        return str(obj.price_per_person or 0)


class TripBookingSerializer(serializers.ModelSerializer):
    trip = TripListSerializer(read_only=True)

    class Meta:
        model = TripBooking
        fields = [
            'id', 'booking_ref', 'trip', 'trip_date',
            'customer_name', 'customer_email', 'customer_phone',
            'adults', 'children', 'is_private',
            'pickup_address',
            'price_per_adult', 'price_per_child', 'extras_price',
            'discount', 'total_price', 'currency',
            'status', 'special_requests', 'custom_field_values', 'created_at'
        ]
        read_only_fields = [
            'id', 'booking_ref', 'status', 'created_at',
            'price_per_adult', 'price_per_child', 'total_price'
        ]


class TripBookingCreateSerializer(serializers.ModelSerializer):
    trip_id = serializers.IntegerField()
    schedule_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = TripBooking
        fields = [
            'trip_id', 'schedule_id', 'trip_date',
            'customer_name', 'customer_email', 'customer_phone',
            'adults', 'children', 'is_private',
            'pickup_address', 'special_requests', 'custom_field_values'
        ]

    custom_field_values = serializers.JSONField(required=False, default=dict)

    def validate_custom_field_values(self, value):
        from apps.accounts.models import CustomField
        required_fields = CustomField.objects.filter(
            is_active=True, is_required=True, applies_to__in=['trip', 'both']
        ).values_list('name', flat=True)
        for field_name in required_fields:
            if field_name not in value or not str(value[field_name]).strip():
                field = CustomField.objects.get(name=field_name)
                raise serializers.ValidationError({field_name: f'{field.label} is required.'})
        return value

    def create(self, validated_data):
        trip_id = validated_data.pop('trip_id')
        schedule_id = validated_data.pop('schedule_id', None)

        trip = Trip.objects.get(id=trip_id)
        schedule = TripSchedule.objects.get(id=schedule_id) if schedule_id else None

        # Calculate pricing from tiers
        is_private = validated_data.get('is_private', False)
        adults = validated_data.get('adults', 1)
        children = validated_data.get('children', 0)
        total_persons = adults + children

        # Find matching price tier
        tier = trip.price_tiers.filter(
            min_persons__lte=total_persons,
            max_persons__gte=total_persons
        ).first()

        if tier:
            price_per_adult = tier.private_price if is_private else tier.shared_price
        elif trip.price_tiers.exists():
            # Use the largest tier if group exceeds all tiers
            largest_tier = trip.price_tiers.order_by('-max_persons').first()
            price_per_adult = largest_tier.private_price if is_private else largest_tier.shared_price
        else:
            # Fallback to legacy fields
            price_per_adult = trip.private_tour_price if (is_private and trip.private_tour_price) else (trip.price_per_person or 0)
        price_per_child = price_per_adult  # Children same price as adults

        booking = TripBooking.objects.create(
            trip=trip,
            schedule=schedule,
            price_per_adult=price_per_adult,
            price_per_child=price_per_child,
            **validated_data
        )

        # Calculate and save total
        booking.total_price = booking.calculate_total()
        booking.save()

        return booking


class TripBookingListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views."""
    trip_name = serializers.CharField(source='trip.name')

    class Meta:
        model = TripBooking
        fields = [
            'id', 'booking_ref', 'trip_name', 'trip_date',
            'customer_name', 'adults', 'children',
            'status', 'total_price', 'created_at'
        ]
