from rest_framework import serializers
from apps.trips.models import Trip, TripImage, TripSchedule, TripBooking


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


class TripSerializer(serializers.ModelSerializer):
    images = TripImageSerializer(many=True, read_only=True)
    schedules = TripScheduleSerializer(many=True, read_only=True)
    inclusions_list = serializers.ListField(read_only=True)
    exclusions_list = serializers.ListField(read_only=True)
    destinations_list = serializers.ListField(read_only=True)

    class Meta:
        model = Trip
        fields = [
            'id', 'name', 'slug', 'description', 'short_description',
            'trip_type', 'departure_location', 'destinations', 'destinations_list',
            'duration_hours', 'duration_days', 'min_participants', 'max_participants',
            'price_per_person', 'child_price', 'private_tour_price', 'currency',
            'inclusions', 'exclusions', 'inclusions_list', 'exclusions_list',
            'itinerary', 'featured_image', 'images', 'schedules',
            'is_featured', 'order'
        ]


class TripListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views."""

    class Meta:
        model = Trip
        fields = [
            'id', 'name', 'slug', 'short_description', 'trip_type',
            'departure_location', 'duration_days', 'duration_hours',
            'price_per_person', 'currency', 'featured_image', 'is_featured'
        ]


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
            'status', 'special_requests', 'created_at'
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
            'pickup_address', 'special_requests'
        ]

    def create(self, validated_data):
        trip_id = validated_data.pop('trip_id')
        schedule_id = validated_data.pop('schedule_id', None)

        trip = Trip.objects.get(id=trip_id)
        schedule = TripSchedule.objects.get(id=schedule_id) if schedule_id else None

        # Calculate pricing
        is_private = validated_data.get('is_private', False)
        adults = validated_data.get('adults', 1)
        children = validated_data.get('children', 0)

        if is_private and trip.private_tour_price:
            price_per_adult = trip.private_tour_price
            price_per_child = 0
        else:
            price_per_adult = trip.price_per_person
            price_per_child = trip.child_price or 0

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
