from rest_framework import serializers
from decimal import Decimal

from apps.vehicles.models import Vehicle, VehicleCategory, VehicleImage
from apps.rentals.models import Rental, InsuranceOption, RentalExtra, RentalExtraBooking
from apps.rental_companies.models import RentalCompany


class RentalCompanyPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentalCompany
        fields = [
            'id', 'company_name', 'slug', 'logo', 'short_description',
            'city', 'average_rating', 'total_reviews', 'offers_delivery',
            'delivery_fee', 'offers_airport_pickup',
        ]


class RentalCompanyDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentalCompany
        fields = [
            'id', 'company_name', 'slug', 'logo', 'short_description',
            'city', 'average_rating', 'total_reviews', 'offers_delivery',
            'delivery_fee', 'offers_airport_pickup',
            'description', 'cover_image', 'phone', 'whatsapp', 'website',
            'address', 'region', 'operating_hours', 'pickup_cities',
            'minimum_rental_days', 'maximum_rental_days', 'minimum_driver_age',
            'accepted_payment_methods',
        ]


class InsuranceOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceOption
        fields = ['id', 'name', 'description', 'price_per_day', 'coverage_details']


class RentalExtraSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentalExtra
        fields = ['id', 'name', 'description', 'price_per_day', 'max_quantity', 'icon']


class RentalSearchResultSerializer(serializers.Serializer):
    vehicle_id = serializers.IntegerField()
    vehicle_name = serializers.CharField()
    category = serializers.CharField()
    category_slug = serializers.CharField()
    company = RentalCompanyPublicSerializer()
    images = serializers.ListField(child=serializers.URLField())
    passengers = serializers.IntegerField()
    luggage = serializers.IntegerField()
    doors = serializers.IntegerField(allow_null=True)
    transmission = serializers.CharField()
    fuel_type = serializers.CharField()
    fuel_policy = serializers.CharField()
    features = serializers.ListField(child=serializers.CharField())
    daily_rate = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_days = serializers.IntegerField()
    deposit = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    mileage_limit_per_day = serializers.IntegerField(allow_null=True)
    extra_mileage_fee = serializers.DecimalField(
        max_digits=6, decimal_places=2, allow_null=True,
    )
    currency = serializers.CharField()
    company_offers_delivery = serializers.BooleanField()
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2)


class RentalCitySerializer(serializers.Serializer):
    city = serializers.CharField()
    company_count = serializers.IntegerField()


class RentalCreateSerializer(serializers.Serializer):
    vehicle_id = serializers.IntegerField()
    pickup_date = serializers.DateField()
    return_date = serializers.DateField()
    customer_name = serializers.CharField(max_length=200)
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(max_length=20)
    driver_license_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    driver_license_expiry = serializers.DateField(required=False, allow_null=True)
    driver_date_of_birth = serializers.DateField(required=False, allow_null=True)
    flight_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    pickup_location = serializers.CharField(max_length=300, required=False, allow_blank=True)
    dropoff_location = serializers.CharField(max_length=300, required=False, allow_blank=True)
    insurance_id = serializers.IntegerField(required=False, allow_null=True)
    extras = serializers.ListField(
        child=serializers.DictField(),
        required=False,
    )
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate(self, data):
        if data['return_date'] <= data['pickup_date']:
            raise serializers.ValidationError(
                {'return_date': 'Return date must be after pickup date.'}
            )
        # Validate vehicle exists and is available for rental marketplace
        try:
            vehicle = Vehicle.objects.select_related('company').get(
                id=data['vehicle_id'],
                is_active=True,
                is_available_for_rental_marketplace=True,
            )
        except Vehicle.DoesNotExist:
            raise serializers.ValidationError(
                {'vehicle_id': 'Vehicle not found or not available for rental.'}
            )

        if not vehicle.company or vehicle.company.status != RentalCompany.Status.APPROVED:
            raise serializers.ValidationError(
                {'vehicle_id': 'Vehicle company is not approved.'}
            )

        data['_vehicle'] = vehicle

        # Validate insurance if provided
        insurance_id = data.get('insurance_id')
        if insurance_id:
            try:
                insurance = InsuranceOption.objects.get(id=insurance_id, is_active=True)
                data['_insurance'] = insurance
            except InsuranceOption.DoesNotExist:
                raise serializers.ValidationError(
                    {'insurance_id': 'Insurance option not found or not active.'}
                )

        # Validate extras if provided
        extras_data = data.get('extras', [])
        validated_extras = []
        for item in extras_data:
            extra_id = item.get('extra_id')
            quantity = item.get('quantity', 1)
            if not extra_id:
                raise serializers.ValidationError(
                    {'extras': 'Each extra must include extra_id.'}
                )
            try:
                extra = RentalExtra.objects.get(id=extra_id, is_active=True)
            except RentalExtra.DoesNotExist:
                raise serializers.ValidationError(
                    {'extras': f'Rental extra with id {extra_id} not found or not active.'}
                )
            if quantity < 1 or quantity > extra.max_quantity:
                raise serializers.ValidationError(
                    {'extras': f'Quantity for {extra.name} must be between 1 and {extra.max_quantity}.'}
                )
            validated_extras.append({'extra': extra, 'quantity': quantity})
        data['_validated_extras'] = validated_extras

        return data


class RentalExtraBookingSerializer(serializers.ModelSerializer):
    extra_name = serializers.CharField(source='extra.name', read_only=True)

    class Meta:
        model = RentalExtraBooking
        fields = ['id', 'extra_name', 'quantity', 'price_per_day', 'total']


class RentalVehicleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'name', 'category_name', 'passengers', 'luggage',
            'doors', 'transmission', 'fuel_type', 'fuel_policy', 'images',
        ]

    def get_images(self, obj):
        request = self.context.get('request')
        images = obj.images.all().order_by('order', 'created_at')
        urls = []
        for img in images:
            if img.image:
                url = img.image.url
                if request:
                    url = request.build_absolute_uri(url)
                urls.append(url)
        return urls


class RentalSerializer(serializers.ModelSerializer):
    vehicle = RentalVehicleSerializer(read_only=True)
    company = RentalCompanyPublicSerializer(read_only=True)
    insurance = InsuranceOptionSerializer(read_only=True)
    booked_extras = RentalExtraBookingSerializer(many=True, read_only=True)

    class Meta:
        model = Rental
        fields = [
            'id', 'booking_ref', 'company', 'vehicle',
            'customer_name', 'customer_email', 'customer_phone',
            'driver_license_number', 'driver_license_expiry',
            'driver_date_of_birth', 'flight_number',
            'pickup_date', 'return_date', 'actual_return_date',
            'pickup_location', 'dropoff_location',
            'insurance', 'insurance_total',
            'daily_rate', 'total_days', 'vehicle_total',
            'extras_total', 'delivery_fee', 'deposit_amount',
            'total_price', 'currency',
            'commission_rate', 'commission_amount', 'company_payout_amount',
            'status', 'notes', 'booked_extras',
            'created_at', 'updated_at',
        ]
