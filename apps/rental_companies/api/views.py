from collections import Counter
from datetime import datetime
from decimal import Decimal

from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import HasAPIKeyOrIsAuthenticated
from apps.rental_companies.models import RentalCompany, VehicleAvailability
from apps.rentals.models import InsuranceOption, Rental, RentalExtra, RentalExtraBooking
from apps.vehicles.models import Vehicle

from .serializers import (
    InsuranceOptionSerializer,
    RentalCitySerializer,
    RentalCompanyDetailSerializer,
    RentalCompanyPublicSerializer,
    RentalCreateSerializer,
    RentalExtraSerializer,
    RentalSearchResultSerializer,
    RentalSerializer,
)


class RentalSearchView(APIView):
    """Search for available rental vehicles by city, dates, and filters."""

    permission_classes = [AllowAny]

    def get(self, request):
        city = request.query_params.get('city')
        pickup_date_str = request.query_params.get('pickup_date')
        return_date_str = request.query_params.get('return_date')

        if not city or not pickup_date_str or not return_date_str:
            return Response(
                {'error': 'city, pickup_date, and return_date are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            pickup_date = datetime.strptime(pickup_date_str, '%Y-%m-%d').date()
            return_date = datetime.strptime(return_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Dates must be in YYYY-MM-DD format.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if return_date <= pickup_date:
            return Response(
                {'error': 'return_date must be after pickup_date.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_days = (return_date - pickup_date).days

        # Find approved companies that serve this city
        companies = RentalCompany.objects.filter(
            status=RentalCompany.Status.APPROVED,
            pickup_cities__contains=[city],
        )

        if not companies.exists():
            # Fallback: try case-insensitive search within the JSON list
            companies = RentalCompany.objects.filter(
                status=RentalCompany.Status.APPROVED,
            )
            company_ids = []
            city_lower = city.lower()
            for company in companies:
                if isinstance(company.pickup_cities, list):
                    for c in company.pickup_cities:
                        if c.lower() == city_lower:
                            company_ids.append(company.id)
                            break
            companies = RentalCompany.objects.filter(id__in=company_ids)

        # Base vehicle queryset
        vehicles = Vehicle.objects.filter(
            company__in=companies,
            is_active=True,
            is_available_for_rental_marketplace=True,
        ).select_related('company', 'category').prefetch_related('images', 'features')

        # Exclude vehicles with overlapping availability blocks
        blocked_vehicle_ids = VehicleAvailability.objects.filter(
            start_date__lt=return_date,
            end_date__gt=pickup_date,
        ).values_list('vehicle_id', flat=True)
        vehicles = vehicles.exclude(id__in=blocked_vehicle_ids)

        # Exclude vehicles with overlapping active/confirmed rentals
        overlapping_rental_ids = Rental.objects.filter(
            status__in=[Rental.Status.PENDING, Rental.Status.CONFIRMED, Rental.Status.ACTIVE],
            pickup_date__lt=return_date,
            return_date__gt=pickup_date,
        ).values_list('vehicle_id', flat=True)
        vehicles = vehicles.exclude(id__in=overlapping_rental_ids)

        # Optional filters
        category = request.query_params.get('category')
        if category:
            vehicles = vehicles.filter(category__slug=category)

        passengers = request.query_params.get('passengers')
        if passengers:
            try:
                vehicles = vehicles.filter(passengers__gte=int(passengers))
            except ValueError:
                pass

        transmission = request.query_params.get('transmission')
        if transmission:
            vehicles = vehicles.filter(transmission=transmission)

        fuel_type = request.query_params.get('fuel_type')
        if fuel_type:
            vehicles = vehicles.filter(fuel_type=fuel_type)

        # Build results with pricing
        results = []
        for vehicle in vehicles:
            daily_rate = self._calculate_daily_rate(vehicle, total_days)
            if daily_rate is None:
                continue

            total_price = daily_rate * total_days

            # Price filters
            min_price = request.query_params.get('min_price')
            if min_price:
                try:
                    if total_price < Decimal(min_price):
                        continue
                except Exception:
                    pass

            max_price = request.query_params.get('max_price')
            if max_price:
                try:
                    if total_price > Decimal(max_price):
                        continue
                except Exception:
                    pass

            image_urls = []
            for img in vehicle.images.all():
                if img.image:
                    url = img.image.url
                    if request:
                        url = request.build_absolute_uri(url)
                    image_urls.append(url)

            feature_names = [f.name for f in vehicle.features.all()]

            results.append({
                'vehicle_id': vehicle.id,
                'vehicle_name': vehicle.name,
                'category': vehicle.category.name,
                'category_slug': vehicle.category.slug,
                'company': RentalCompanyPublicSerializer(vehicle.company).data,
                'images': image_urls,
                'passengers': vehicle.passengers,
                'luggage': vehicle.luggage,
                'doors': vehicle.doors,
                'transmission': vehicle.transmission,
                'fuel_type': vehicle.fuel_type,
                'fuel_policy': vehicle.fuel_policy,
                'features': feature_names,
                'daily_rate': daily_rate,
                'total_price': total_price,
                'total_days': total_days,
                'deposit': vehicle.rental_deposit,
                'mileage_limit_per_day': vehicle.mileage_limit_per_day,
                'extra_mileage_fee': vehicle.extra_mileage_fee,
                'currency': 'MAD',
                'company_offers_delivery': vehicle.company.offers_delivery,
                'delivery_fee': vehicle.company.delivery_fee,
            })

        # Sorting
        sort = request.query_params.get('sort', 'price_asc')
        if sort == 'price_asc':
            results.sort(key=lambda r: r['total_price'])
        elif sort == 'price_desc':
            results.sort(key=lambda r: r['total_price'], reverse=True)
        elif sort == 'rating_desc':
            results.sort(key=lambda r: r['company']['average_rating'], reverse=True)

        # Pagination
        try:
            page = int(request.query_params.get('page', 1))
        except ValueError:
            page = 1
        try:
            page_size = int(request.query_params.get('page_size', 20))
        except ValueError:
            page_size = 20
        page_size = min(page_size, 100)

        total_count = len(results)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_results = results[start:end]

        serializer = RentalSearchResultSerializer(paginated_results, many=True)
        return Response({
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if page_size else 1,
            'results': serializer.data,
        })

    def _calculate_daily_rate(self, vehicle, total_days):
        """Determine the effective daily rate based on rental duration."""
        if total_days >= 30 and vehicle.monthly_rate:
            return (vehicle.monthly_rate / Decimal('30')).quantize(Decimal('0.01'))
        if total_days >= 7 and vehicle.weekly_rate:
            return (vehicle.weekly_rate / Decimal('7')).quantize(Decimal('0.01'))
        if vehicle.daily_rate:
            return vehicle.daily_rate
        return None


class RentalCitiesView(APIView):
    """Return cities served by approved rental companies with company counts."""

    permission_classes = [AllowAny]

    def get(self, request):
        companies = RentalCompany.objects.filter(
            status=RentalCompany.Status.APPROVED,
        ).values_list('pickup_cities', flat=True)

        city_counter = Counter()
        for cities_list in companies:
            if isinstance(cities_list, list):
                for city in cities_list:
                    city_counter[city] += 1

        results = [
            {'city': city, 'company_count': count}
            for city, count in city_counter.most_common()
        ]
        serializer = RentalCitySerializer(results, many=True)
        return Response(serializer.data)


class RentalCompanyProfileView(APIView):
    """Return a company profile with its active rental vehicles."""

    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            company = RentalCompany.objects.get(
                slug=slug,
                status=RentalCompany.Status.APPROVED,
            )
        except RentalCompany.DoesNotExist:
            return Response(
                {'error': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        vehicles = Vehicle.objects.filter(
            company=company,
            is_active=True,
            is_available_for_rental_marketplace=True,
        ).select_related('category').prefetch_related('images', 'features')

        vehicle_list = []
        for vehicle in vehicles:
            image_urls = []
            for img in vehicle.images.all():
                if img.image:
                    url = img.image.url
                    if request:
                        url = request.build_absolute_uri(url)
                    image_urls.append(url)

            feature_names = [f.name for f in vehicle.features.all()]

            vehicle_list.append({
                'id': vehicle.id,
                'name': vehicle.name,
                'category': vehicle.category.name,
                'category_slug': vehicle.category.slug,
                'passengers': vehicle.passengers,
                'luggage': vehicle.luggage,
                'doors': vehicle.doors,
                'transmission': vehicle.transmission,
                'fuel_type': vehicle.fuel_type,
                'fuel_policy': vehicle.fuel_policy,
                'features': feature_names,
                'images': image_urls,
                'daily_rate': vehicle.daily_rate,
                'weekly_rate': vehicle.weekly_rate,
                'monthly_rate': vehicle.monthly_rate,
                'rental_deposit': vehicle.rental_deposit,
                'mileage_limit_per_day': vehicle.mileage_limit_per_day,
                'extra_mileage_fee': vehicle.extra_mileage_fee,
            })

        company_data = RentalCompanyDetailSerializer(company).data
        company_data['vehicles'] = vehicle_list
        return Response(company_data)


class RentalCreateView(APIView):
    """Create a new car rental booking."""

    permission_classes = [HasAPIKeyOrIsAuthenticated]

    def post(self, request):
        serializer = RentalCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        vehicle = data['_vehicle']
        company = vehicle.company
        pickup_date = data['pickup_date']
        return_date = data['return_date']
        total_days = (return_date - pickup_date).days

        # Calculate daily rate based on duration
        if total_days >= 30 and vehicle.monthly_rate:
            daily_rate = (vehicle.monthly_rate / Decimal('30')).quantize(Decimal('0.01'))
        elif total_days >= 7 and vehicle.weekly_rate:
            daily_rate = (vehicle.weekly_rate / Decimal('7')).quantize(Decimal('0.01'))
        else:
            daily_rate = vehicle.daily_rate

        if not daily_rate:
            return Response(
                {'error': 'Vehicle does not have pricing configured.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vehicle_total = daily_rate * total_days

        # Insurance
        insurance = data.get('_insurance')
        insurance_total = Decimal('0')
        if insurance:
            insurance_total = insurance.price_per_day * total_days

        # Extras
        validated_extras = data.get('_validated_extras', [])
        extras_total = Decimal('0')
        for item in validated_extras:
            extra = item['extra']
            quantity = item['quantity']
            extras_total += extra.price_per_day * quantity * total_days

        # Deposit
        deposit_amount = vehicle.rental_deposit or Decimal('0')

        # Total price
        total_price = vehicle_total + insurance_total + extras_total

        # Commission
        commission_rate = company.commission_rate
        commission_amount = (total_price * commission_rate / Decimal('100')).quantize(Decimal('0.01'))
        company_payout_amount = total_price - commission_amount

        # Create rental
        rental = Rental.objects.create(
            company=company,
            vehicle=vehicle,
            customer=request.user if request.user.is_authenticated else None,
            customer_name=data['customer_name'],
            customer_email=data['customer_email'],
            customer_phone=data['customer_phone'],
            driver_license_number=data.get('driver_license_number', ''),
            driver_license_expiry=data.get('driver_license_expiry'),
            driver_date_of_birth=data.get('driver_date_of_birth'),
            flight_number=data.get('flight_number', ''),
            pickup_date=pickup_date,
            return_date=return_date,
            pickup_location=data.get('pickup_location', ''),
            dropoff_location=data.get('dropoff_location', ''),
            insurance=insurance,
            insurance_total=insurance_total,
            daily_rate=daily_rate,
            total_days=total_days,
            vehicle_total=vehicle_total,
            extras_total=extras_total,
            deposit_amount=deposit_amount,
            total_price=total_price,
            currency='MAD',
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            company_payout_amount=company_payout_amount,
        )

        # Create extra bookings
        for item in validated_extras:
            extra = item['extra']
            quantity = item['quantity']
            extra_total = extra.price_per_day * quantity * total_days
            RentalExtraBooking.objects.create(
                rental=rental,
                extra=extra,
                quantity=quantity,
                price_per_day=extra.price_per_day,
                total=extra_total,
            )

        # Send notification emails
        try:
            from apps.notifications.tasks import send_booking_confirmation, send_admin_new_booking_alert
            send_booking_confirmation.delay(
                booking_ref=rental.booking_ref,
                customer_email=rental.customer_email,
                customer_name=rental.customer_name,
                booking_details={
                    'vehicle': vehicle.name,
                    'company': company.company_name,
                    'pickup_date': str(rental.pickup_date),
                    'return_date': str(rental.return_date),
                    'total_price': str(rental.total_price),
                    'currency': rental.currency,
                },
            )
            send_admin_new_booking_alert.delay(
                booking_ref=rental.booking_ref,
                booking_type='rental',
                customer_name=rental.customer_name,
                total_price=str(rental.total_price),
            )
        except Exception:
            pass

        return Response(
            RentalSerializer(rental).data,
            status=status.HTTP_201_CREATED,
        )


class RentalByRefView(APIView):
    """Retrieve a rental booking by its booking reference."""

    permission_classes = [HasAPIKeyOrIsAuthenticated]

    def get(self, request, ref):
        try:
            rental = Rental.objects.select_related(
                'company', 'vehicle', 'vehicle__category', 'insurance',
            ).prefetch_related(
                'booked_extras__extra', 'vehicle__images',
            ).get(booking_ref=ref)
        except Rental.DoesNotExist:
            return Response(
                {'error': 'Rental not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(RentalSerializer(rental).data)


class InsuranceOptionListView(APIView):
    """List active insurance options."""

    permission_classes = [AllowAny]

    def get(self, request):
        options = InsuranceOption.objects.filter(is_active=True)
        serializer = InsuranceOptionSerializer(options, many=True)
        return Response(serializer.data)


class RentalExtraListView(APIView):
    """List active rental extras."""

    permission_classes = [AllowAny]

    def get(self, request):
        extras = RentalExtra.objects.filter(is_active=True)
        serializer = RentalExtraSerializer(extras, many=True)
        return Response(serializer.data)
