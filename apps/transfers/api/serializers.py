from rest_framework import serializers
from decimal import Decimal
from apps.transfers.models import Transfer, TransferExtra, TransferExtraBooking
from apps.vehicles.api.serializers import VehicleCategorySerializer
from .validators import validate_phone, validate_future_datetime, validate_latitude, validate_longitude


def _lookup_base_price(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_category, distance_km=None):
    """Price a single leg. Returns (base_price, vehicle, cost, deposit_pct, method); base_price is None if no pricing found."""
    from apps.locations.models import Route, VehicleRoutePricing
    from apps.locations.services import calculate_distance_haversine
    from apps.locations.api.views import (
        find_matching_zone, find_matching_pickup_zone, find_matching_dropoff_zone,
        haversine_distance,
    )
    from apps.vehicles.models import VehicleZonePricing

    base_price = None
    deposit_pct = Decimal('0')
    priced_vehicle = None
    priced_cost = None
    pricing_method = ''

    p_lat, p_lng = float(pickup_lat), float(pickup_lng)
    d_lat, d_lng = float(dropoff_lat), float(dropoff_lng)

    pickup_zone = find_matching_zone(p_lat, p_lng)
    dropoff_zone = find_matching_zone(d_lat, d_lng)

    if pickup_zone and dropoff_zone and pickup_zone.id == dropoff_zone.id:
        zone = pickup_zone
        zone_distance = distance_km or float(haversine_distance(p_lat, p_lng, d_lat, d_lng))
        distance_range = zone.get_range_for_distance(zone_distance)
        if distance_range:
            zp = VehicleZonePricing.objects.filter(
                zone_distance_range=distance_range,
                vehicle__category=vehicle_category,
                is_active=True,
            ).select_related('vehicle__supplier').first()
            if zp:
                base_price = zp.price
                deposit_pct = zone.deposit_percentage
                pricing_method = 'zone'
                priced_vehicle = zp.vehicle
                priced_cost = zp.cost

    if base_price is None:
        for route in Route.objects.filter(is_active=True):
            if route.origin_latitude and route.origin_longitude and route.destination_latitude and route.destination_longitude:
                o_dist = float(calculate_distance_haversine(p_lat, p_lng, float(route.origin_latitude), float(route.origin_longitude)))
                d_dist = float(calculate_distance_haversine(d_lat, d_lng, float(route.destination_latitude), float(route.destination_longitude)))
                matched = (o_dist <= float(route.origin_radius_km) and d_dist <= float(route.destination_radius_km))
                is_reverse = False
                if not matched and route.is_bidirectional:
                    o_rev = float(calculate_distance_haversine(p_lat, p_lng, float(route.destination_latitude), float(route.destination_longitude)))
                    d_rev = float(calculate_distance_haversine(d_lat, d_lng, float(route.origin_latitude), float(route.origin_longitude)))
                    if o_rev <= float(route.destination_radius_km) and d_rev <= float(route.origin_radius_km):
                        matched = True
                        is_reverse = True
                if matched:
                    rp = VehicleRoutePricing.objects.filter(
                        route=route, vehicle__category=vehicle_category, is_active=True,
                        pickup_zone__isnull=True, dropoff_zone__isnull=True,
                    ).select_related('vehicle__supplier').first()
                    if rp:
                        base_price = rp.price
                        priced_vehicle = rp.vehicle
                        priced_cost = rp.cost
                        if is_reverse:
                            m_pickup = find_matching_dropoff_zone(route, p_lat, p_lng)
                            m_dropoff = find_matching_pickup_zone(route, d_lat, d_lng)
                        else:
                            m_pickup = find_matching_pickup_zone(route, p_lat, p_lng)
                            m_dropoff = find_matching_dropoff_zone(route, d_lat, d_lng)
                        pickup_adj = Decimal(str(rp.pickup_zone_adjustments.get(str(m_pickup.id), 0))) if m_pickup else Decimal('0')
                        dropoff_adj = Decimal(str(rp.dropoff_zone_adjustments.get(str(m_dropoff.id), 0))) if m_dropoff else Decimal('0')
                        base_price = base_price + pickup_adj + dropoff_adj
                        deposit_pct = route.deposit_percentage
                        pricing_method = 'route'
                    break

    return base_price, priced_vehicle, priced_cost, deposit_pct, pricing_method


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
            'total_price', 'deposit_amount', 'currency', 'status', 'special_requests',
            'is_round_trip', 'return_datetime', 'booked_extras',
            'custom_field_values', 'created_at'
        ]
        read_only_fields = [
            'id', 'booking_ref', 'status', 'created_at',
            'base_price', 'extras_price', 'total_price', 'deposit_amount'
        ]


class TransferCreateSerializer(serializers.ModelSerializer):
    vehicle_category_id = serializers.IntegerField()
    extras = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True
    )
    transfer_type = serializers.CharField(required=False, default='custom', allow_blank=True)
    customer_phone = serializers.CharField(validators=[validate_phone])
    pickup_datetime = serializers.DateTimeField(validators=[validate_future_datetime])
    pickup_latitude = serializers.FloatField(validators=[validate_latitude], required=False)
    pickup_longitude = serializers.FloatField(validators=[validate_longitude], required=False)
    dropoff_latitude = serializers.FloatField(validators=[validate_latitude], required=False)
    dropoff_longitude = serializers.FloatField(validators=[validate_longitude], required=False)

    custom_field_values = serializers.JSONField(required=False, default=dict)

    # Round trip: optional explicit return destination (defaults to outbound origin)
    return_dropoff_address = serializers.CharField(required=False, allow_blank=True, default='')
    return_dropoff_lat = serializers.FloatField(validators=[validate_latitude], required=False, allow_null=True)
    return_dropoff_lng = serializers.FloatField(validators=[validate_longitude], required=False, allow_null=True)

    def validate_custom_field_values(self, value):
        from apps.accounts.models import CustomField
        required_fields = CustomField.objects.filter(
            is_active=True, is_required=True, applies_to__in=['transfer', 'both']
        ).values_list('name', flat=True)
        for field_name in required_fields:
            if field_name not in value or not str(value[field_name]).strip():
                field = CustomField.objects.get(name=field_name)
                raise serializers.ValidationError({field_name: f'{field.label} is required.'})
        return value

    def validate_transfer_type(self, value):
        valid = ['airport_pickup', 'airport_dropoff', 'city_to_city', 'port_transfer', 'custom']
        if not value or value not in valid:
            return 'custom'
        return value

    def validate_pickup_datetime(self, value):
        from apps.transfers.models import BlockedDate
        block = BlockedDate.covering(value.date())
        if block:
            msg = block.customer_message.strip() if block.customer_message else 'Selected pickup date is unavailable. Please pick another date.'
            raise serializers.ValidationError(msg)
        return value

    def validate(self, attrs):
        # Also block the return-trip date if round trip
        if attrs.get('is_round_trip') and attrs.get('return_datetime'):
            from apps.transfers.models import BlockedDate
            block = BlockedDate.covering(attrs['return_datetime'].date())
            if block:
                msg = block.customer_message.strip() if block.customer_message else 'Selected return date is unavailable. Please pick another date.'
                raise serializers.ValidationError({'return_datetime': msg})
        return attrs

    class Meta:
        model = Transfer
        fields = [
            'id', 'booking_ref',
            'customer_name', 'customer_email', 'customer_phone',
            'transfer_type', 'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'dropoff_address', 'dropoff_latitude', 'dropoff_longitude',
            'pickup_datetime', 'flight_number', 'flight_arrival_time',
            'passengers', 'luggage', 'child_seats',
            'vehicle_category_id', 'special_requests',
            'is_round_trip', 'return_datetime',
            'return_dropoff_address', 'return_dropoff_lat', 'return_dropoff_lng',
            'extras', 'custom_field_values',
            'base_price', 'extras_price',
            'total_price', 'deposit_amount', 'currency', 'status',
        ]
        read_only_fields = ['id', 'booking_ref', 'base_price', 'extras_price', 'total_price', 'deposit_amount', 'currency', 'status']

    def create(self, validated_data):
        from apps.vehicles.models import VehicleCategory
        from apps.locations.services import calculate_distance

        extras_data = validated_data.pop('extras', [])
        vehicle_category_id = validated_data.pop('vehicle_category_id')
        return_dropoff_address = validated_data.pop('return_dropoff_address', '') or ''
        return_dropoff_lat = validated_data.pop('return_dropoff_lat', None)
        return_dropoff_lng = validated_data.pop('return_dropoff_lng', None)
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

        # Price outbound leg
        base_price = None
        priced_vehicle = None
        priced_cost = None
        deposit_percentage_from_pricing = Decimal('0')
        pricing_method = ''

        if all([pickup_lat, pickup_lng, dropoff_lat, dropoff_lng]):
            base_price, priced_vehicle, priced_cost, deposit_percentage_from_pricing, pricing_method = \
                _lookup_base_price(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_category, distance_km)

        if base_price is None:
            raise serializers.ValidationError('No pricing configured for this route. Please contact support.')

        # Price return leg independently (B→C, not a copy of A→B)
        return_base_price = base_price
        return_priced_vehicle = priced_vehicle
        return_priced_cost = priced_cost
        if validated_data.get('is_round_trip') and all([dropoff_lat, dropoff_lng]):
            rt_dropoff_lat_lookup = return_dropoff_lat if return_dropoff_lat is not None else pickup_lat
            rt_dropoff_lng_lookup = return_dropoff_lng if return_dropoff_lng is not None else pickup_lng
            if all([rt_dropoff_lat_lookup, rt_dropoff_lng_lookup]):
                rt_price, rt_vehicle, rt_cost, _, _ = _lookup_base_price(
                    dropoff_lat, dropoff_lng, rt_dropoff_lat_lookup, rt_dropoff_lng_lookup, vehicle_category
                )
                if rt_price is not None:
                    return_base_price = rt_price
                    if rt_vehicle:
                        return_priced_vehicle = rt_vehicle
                        return_priced_cost = rt_cost

        # Create transfer
        from apps.accounts.models import SiteSettings
        priced_supplier = priced_vehicle.supplier if priced_vehicle and priced_vehicle.supplier_id else None
        transfer = Transfer.objects.create(
            vehicle_category=vehicle_category,
            vehicle=priced_vehicle,
            supplier=priced_supplier,
            cost=priced_cost,
            distance_km=distance_km,
            duration_minutes=duration_minutes,
            base_price=base_price,
            pricing_method=pricing_method if all([pickup_lat, pickup_lng, dropoff_lat, dropoff_lng]) else '',
            currency=SiteSettings.get_settings().default_currency,
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

        # Deposit is calculated on the combined price of all legs
        if transfer.is_round_trip:
            deposit_base = transfer.total_price + return_base_price + extras_total
        else:
            deposit_base = transfer.total_price
        if deposit_percentage_from_pricing > 0:
            transfer.deposit_amount = (deposit_base * deposit_percentage_from_pricing / Decimal('100')).quantize(Decimal('0.01'))

        transfer.save()

        # Handle round trip
        if transfer.is_round_trip and transfer.return_datetime:
            # Return pickup is always the outbound dropoff (locked)
            # Return dropoff defaults to outbound pickup unless client specified a different destination
            rt_dropoff_addr = return_dropoff_address if return_dropoff_address else transfer.pickup_address
            rt_dropoff_lat = return_dropoff_lat if return_dropoff_lat is not None else transfer.pickup_latitude
            rt_dropoff_lng = return_dropoff_lng if return_dropoff_lng is not None else transfer.pickup_longitude
            return_priced_supplier = return_priced_vehicle.supplier if return_priced_vehicle and return_priced_vehicle.supplier_id else None
            return_transfer = Transfer.objects.create(
                customer=transfer.customer,
                customer_name=transfer.customer_name,
                customer_email=transfer.customer_email,
                customer_phone=transfer.customer_phone,
                transfer_type=transfer.transfer_type,
                pickup_address=transfer.dropoff_address,
                pickup_latitude=transfer.dropoff_latitude,
                pickup_longitude=transfer.dropoff_longitude,
                dropoff_address=rt_dropoff_addr,
                dropoff_latitude=rt_dropoff_lat,
                dropoff_longitude=rt_dropoff_lng,
                distance_km=distance_km,
                duration_minutes=duration_minutes,
                pickup_datetime=transfer.return_datetime,
                passengers=transfer.passengers,
                luggage=transfer.luggage,
                child_seats=transfer.child_seats,
                vehicle_category=vehicle_category,
                vehicle=return_priced_vehicle,
                supplier=return_priced_supplier,
                cost=return_priced_cost,
                base_price=return_base_price,
                extras_price=extras_total,
                total_price=return_base_price + extras_total,
                special_requests=transfer.special_requests,
            )
            transfer.return_transfer = return_transfer
            transfer.save()

        return transfer

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
