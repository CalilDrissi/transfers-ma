from rest_framework import serializers
from decimal import Decimal
from apps.transfers.models import Transfer, TransferExtra, TransferExtraBooking
from apps.vehicles.api.serializers import VehicleCategorySerializer


class TransferExtraSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransferExtra
        fields = ['id', 'name', 'description', 'price', 'is_per_item']


class TransferExtraBookingSerializer(serializers.ModelSerializer):
    extra = TransferExtraSerializer(read_only=True)
    extra_id = serializers.PrimaryKeyRelatedField(
        queryset=TransferExtra.objects.filter(is_active=True),
        source='extra',
        write_only=True
    )

    class Meta:
        model = TransferExtraBooking
        fields = ['id', 'extra', 'extra_id', 'quantity', 'price']
        read_only_fields = ['price']


class TransferSerializer(serializers.ModelSerializer):
    vehicle_category = VehicleCategorySerializer(read_only=True)
    booked_extras = TransferExtraBookingSerializer(many=True, read_only=True)

    class Meta:
        model = Transfer
        fields = [
            'id', 'booking_ref', 'customer_name', 'customer_email', 'customer_phone',
            'transfer_type', 'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'dropoff_address', 'dropoff_latitude', 'dropoff_longitude',
            'distance_km', 'duration_minutes', 'pickup_datetime',
            'flight_number', 'flight_arrival_time',
            'passengers', 'luggage', 'child_seats',
            'vehicle_category', 'base_price', 'extras_price', 'discount',
            'total_price', 'currency', 'status', 'special_requests',
            'is_round_trip', 'return_datetime', 'booked_extras',
            'created_at'
        ]
        read_only_fields = [
            'id', 'booking_ref', 'status', 'created_at',
            'base_price', 'extras_price', 'total_price'
        ]


class TransferCreateSerializer(serializers.ModelSerializer):
    vehicle_category_id = serializers.IntegerField()
    extras = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Transfer
        fields = [
            'customer_name', 'customer_email', 'customer_phone',
            'transfer_type', 'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'dropoff_address', 'dropoff_latitude', 'dropoff_longitude',
            'pickup_datetime', 'flight_number', 'flight_arrival_time',
            'passengers', 'luggage', 'child_seats',
            'vehicle_category_id', 'special_requests',
            'is_round_trip', 'return_datetime', 'extras'
        ]

    def create(self, validated_data):
        from apps.vehicles.models import VehicleCategory
        from apps.locations.services import calculate_distance

        extras_data = validated_data.pop('extras', [])
        vehicle_category_id = validated_data.pop('vehicle_category_id')
        vehicle_category = VehicleCategory.objects.get(id=vehicle_category_id)

        # Calculate distance if coordinates provided
        distance_km = None
        duration_minutes = None
        pickup_lat = validated_data.get('pickup_latitude')
        pickup_lng = validated_data.get('pickup_longitude')
        dropoff_lat = validated_data.get('dropoff_latitude')
        dropoff_lng = validated_data.get('dropoff_longitude')

        if all([pickup_lat, pickup_lng, dropoff_lat, dropoff_lng]):
            try:
                distance_result = calculate_distance(
                    float(pickup_lat), float(pickup_lng),
                    float(dropoff_lat), float(dropoff_lng)
                )
                distance_km = distance_result.get('distance_km')
                duration_minutes = distance_result.get('duration_minutes')
            except Exception:
                pass

        # Calculate base price from distance
        base_price = self._calculate_base_price(distance_km, vehicle_category)

        # Create transfer
        transfer = Transfer.objects.create(
            vehicle_category=vehicle_category,
            distance_km=distance_km,
            duration_minutes=duration_minutes,
            base_price=base_price,
            **validated_data
        )

        # Add extras
        extras_total = Decimal('0')
        for extra_data in extras_data:
            extra = TransferExtra.objects.get(id=extra_data['extra_id'])
            quantity = extra_data.get('quantity', 1)
            price = extra.price * quantity if extra.is_per_item else extra.price

            TransferExtraBooking.objects.create(
                transfer=transfer,
                extra=extra,
                quantity=quantity,
                price=price
            )
            extras_total += price

        # Update extras price and total
        transfer.extras_price = extras_total
        transfer.total_price = transfer.calculate_total()
        transfer.save()

        # Handle round trip
        if transfer.is_round_trip and transfer.return_datetime:
            return_transfer = Transfer.objects.create(
                customer=transfer.customer,
                customer_name=transfer.customer_name,
                customer_email=transfer.customer_email,
                customer_phone=transfer.customer_phone,
                transfer_type=transfer.transfer_type,
                pickup_address=transfer.dropoff_address,
                pickup_latitude=transfer.dropoff_latitude,
                pickup_longitude=transfer.dropoff_longitude,
                dropoff_address=transfer.pickup_address,
                dropoff_latitude=transfer.pickup_latitude,
                dropoff_longitude=transfer.pickup_longitude,
                distance_km=distance_km,
                duration_minutes=duration_minutes,
                pickup_datetime=transfer.return_datetime,
                passengers=transfer.passengers,
                luggage=transfer.luggage,
                child_seats=transfer.child_seats,
                vehicle_category=vehicle_category,
                base_price=base_price,
                extras_price=extras_total,
                total_price=base_price + extras_total,
                special_requests=transfer.special_requests,
            )
            transfer.return_transfer = return_transfer
            transfer.save()

        return transfer

    def _calculate_base_price(self, distance_km, vehicle_category):
        """Calculate base price based on distance and vehicle category."""
        if distance_km is None:
            # Default fallback price if no distance
            return Decimal('500') * vehicle_category.price_multiplier

        # Base rate per km (can be configured in settings later)
        base_rate_per_km = Decimal('5')  # 5 MAD per km
        minimum_price = Decimal('100')   # Minimum 100 MAD

        calculated_price = distance_km * base_rate_per_km * vehicle_category.price_multiplier
        return max(calculated_price, minimum_price)


class TransferQuoteSerializer(serializers.Serializer):
    """Serializer for getting a price quote."""
    pickup_address = serializers.CharField()
    pickup_latitude = serializers.DecimalField(max_digits=10, decimal_places=7)
    pickup_longitude = serializers.DecimalField(max_digits=10, decimal_places=7)
    dropoff_address = serializers.CharField()
    dropoff_latitude = serializers.DecimalField(max_digits=10, decimal_places=7)
    dropoff_longitude = serializers.DecimalField(max_digits=10, decimal_places=7)
    vehicle_category_id = serializers.IntegerField()
    passengers = serializers.IntegerField(default=1)
    is_round_trip = serializers.BooleanField(default=False)
    extras = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )


class TransferListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views."""
    vehicle_category_name = serializers.CharField(source='vehicle_category.name')

    class Meta:
        model = Transfer
        fields = [
            'id', 'booking_ref', 'customer_name', 'pickup_address',
            'dropoff_address', 'pickup_datetime', 'vehicle_category_name',
            'status', 'total_price', 'created_at'
        ]
