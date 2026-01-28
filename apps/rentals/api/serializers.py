from rest_framework import serializers
from apps.rentals.models import Rental, RentalExtra, RentalExtraBooking, InsuranceOption
from apps.vehicles.api.serializers import VehicleListSerializer


class RentalExtraSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentalExtra
        fields = ['id', 'name', 'description', 'daily_price', 'max_price']


class InsuranceOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceOption
        fields = [
            'id', 'insurance_type', 'name', 'description',
            'daily_price', 'deductible', 'coverage_details'
        ]


class RentalExtraBookingSerializer(serializers.ModelSerializer):
    extra = RentalExtraSerializer(read_only=True)
    extra_id = serializers.PrimaryKeyRelatedField(
        queryset=RentalExtra.objects.filter(is_active=True),
        source='extra',
        write_only=True
    )

    class Meta:
        model = RentalExtraBooking
        fields = ['id', 'extra', 'extra_id', 'quantity', 'price']
        read_only_fields = ['price']


class RentalSerializer(serializers.ModelSerializer):
    vehicle = VehicleListSerializer(read_only=True)
    booked_extras = RentalExtraBookingSerializer(many=True, read_only=True)

    class Meta:
        model = Rental
        fields = [
            'id', 'booking_ref', 'customer_name', 'customer_email', 'customer_phone',
            'driver_license_number', 'driver_license_expiry', 'driver_date_of_birth',
            'vehicle', 'pickup_datetime', 'return_datetime',
            'pickup_location', 'return_location',
            'insurance_type', 'daily_rate', 'total_days', 'subtotal',
            'insurance_cost', 'extras_cost', 'different_location_fee',
            'discount', 'total_price', 'deposit', 'currency',
            'status', 'special_requests', 'booked_extras', 'created_at'
        ]
        read_only_fields = [
            'id', 'booking_ref', 'status', 'created_at',
            'total_days', 'subtotal', 'total_price'
        ]


class RentalCreateSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.IntegerField()
    extras = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Rental
        fields = [
            'customer_name', 'customer_email', 'customer_phone',
            'driver_license_number', 'driver_license_expiry', 'driver_date_of_birth',
            'vehicle_id', 'pickup_datetime', 'return_datetime',
            'pickup_location', 'return_location',
            'insurance_type', 'special_requests', 'extras'
        ]

    def create(self, validated_data):
        from apps.vehicles.models import Vehicle

        extras_data = validated_data.pop('extras', [])
        vehicle_id = validated_data.pop('vehicle_id')

        vehicle = Vehicle.objects.get(id=vehicle_id)

        # Get daily rate from vehicle
        daily_rate = vehicle.daily_rate or 0

        # Calculate days
        pickup_dt = validated_data['pickup_datetime']
        return_dt = validated_data['return_datetime']
        delta = return_dt - pickup_dt
        total_days = max(1, delta.days + (1 if delta.seconds > 0 else 0))

        # Calculate insurance cost
        insurance_type = validated_data.get('insurance_type', Rental.InsuranceType.BASIC)
        insurance_cost = 0
        try:
            insurance = InsuranceOption.objects.get(
                insurance_type=insurance_type,
                is_active=True
            )
            insurance_cost = insurance.daily_price * total_days
        except InsuranceOption.DoesNotExist:
            pass

        # Different location fee
        different_location_fee = 0
        if validated_data.get('pickup_location') != validated_data.get('return_location'):
            different_location_fee = 200  # Default fee, could be configurable

        # Create rental
        rental = Rental.objects.create(
            vehicle=vehicle,
            daily_rate=daily_rate,
            total_days=total_days,
            insurance_cost=insurance_cost,
            different_location_fee=different_location_fee,
            deposit=vehicle.daily_rate * 3 if vehicle.daily_rate else 500,
            **validated_data
        )

        # Add extras
        extras_total = 0
        for extra_data in extras_data:
            extra = RentalExtra.objects.get(id=extra_data['extra_id'])
            quantity = extra_data.get('quantity', 1)
            price = extra.calculate_price(total_days) * quantity

            RentalExtraBooking.objects.create(
                rental=rental,
                extra=extra,
                quantity=quantity,
                price=price
            )
            extras_total += price

        # Update totals
        rental.extras_cost = extras_total
        rental.subtotal = rental.calculate_subtotal()
        rental.total_price = rental.calculate_total()
        rental.save()

        return rental


class RentalListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views."""
    vehicle_name = serializers.CharField(source='vehicle.name')

    class Meta:
        model = Rental
        fields = [
            'id', 'booking_ref', 'customer_name', 'vehicle_name',
            'pickup_datetime', 'return_datetime', 'pickup_location',
            'return_location', 'total_days', 'status', 'total_price', 'created_at'
        ]


class RentalQuoteSerializer(serializers.Serializer):
    """Serializer for getting a rental quote."""
    vehicle_id = serializers.IntegerField()
    pickup_location = serializers.CharField()
    return_location = serializers.CharField()
    pickup_datetime = serializers.DateTimeField()
    return_datetime = serializers.DateTimeField()
    insurance_type = serializers.ChoiceField(
        choices=Rental.InsuranceType.choices,
        default=Rental.InsuranceType.BASIC
    )
    extras = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
