from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from datetime import datetime
from apps.rentals.models import Rental, RentalExtra, InsuranceOption
from apps.vehicles.models import Vehicle
from apps.accounts.permissions import HasAPIKeyOrIsAuthenticated
from .serializers import (
    RentalSerializer,
    RentalCreateSerializer,
    RentalListSerializer,
    RentalExtraSerializer,
    InsuranceOptionSerializer,
    RentalQuoteSerializer
)


class RentalViewSet(viewsets.ModelViewSet):
    """ViewSet for car rentals."""
    queryset = Rental.objects.select_related(
        'vehicle', 'pickup_location', 'return_location', 'customer'
    ).prefetch_related('booked_extras__extra')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'vehicle', 'insurance_type']
    search_fields = ['booking_ref', 'customer_name', 'customer_email', 'driver_license_number']
    ordering_fields = ['pickup_datetime', 'created_at', 'total_price']

    def get_permissions(self):
        if self.action in ['create', 'quote', 'available_vehicles']:
            return [HasAPIKeyOrIsAuthenticated()]
        if self.action in ['list', 'retrieve']:
            return [HasAPIKeyOrIsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_serializer_class(self):
        if self.action == 'list':
            return RentalListSerializer
        if self.action == 'create':
            return RentalCreateSerializer
        if self.action == 'quote':
            return RentalQuoteSerializer
        return RentalSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Rental.objects.select_related(
            'vehicle', 'pickup_location', 'return_location', 'customer'
        ).prefetch_related('booked_extras__extra')

        if user.is_staff:
            return queryset
        if user.is_authenticated:
            return queryset.filter(customer=user)
        return queryset.none()

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(customer=self.request.user)
        else:
            serializer.save()

    @action(detail=False, methods=['post'])
    def quote(self, request):
        """Get a rental quote."""
        serializer = RentalQuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from apps.locations.models import Location

        vehicle = Vehicle.objects.get(id=data['vehicle_id'])
        pickup_location = Location.objects.get(id=data['pickup_location_id'])
        return_location = Location.objects.get(id=data['return_location_id'])

        # Calculate days
        delta = data['return_datetime'] - data['pickup_datetime']
        total_days = max(1, delta.days + (1 if delta.seconds > 0 else 0))

        daily_rate = vehicle.daily_rate or 0
        subtotal = daily_rate * total_days

        # Insurance
        insurance_cost = 0
        try:
            insurance = InsuranceOption.objects.get(
                insurance_type=data['insurance_type'],
                is_active=True
            )
            insurance_cost = insurance.daily_price * total_days
        except InsuranceOption.DoesNotExist:
            pass

        # Different location fee
        different_location_fee = 0
        if pickup_location != return_location:
            different_location_fee = 200

        # Extras
        extras_total = 0
        extras_details = []
        for extra_data in data.get('extras', []):
            extra = RentalExtra.objects.get(id=extra_data['extra_id'])
            quantity = extra_data.get('quantity', 1)
            price = extra.calculate_price(total_days) * quantity
            extras_total += price
            extras_details.append({
                'name': extra.name,
                'quantity': quantity,
                'price': float(price)
            })

        total = subtotal + insurance_cost + extras_total + different_location_fee
        deposit = daily_rate * 3 if daily_rate else 500

        return Response({
            'vehicle': {
                'id': vehicle.id,
                'name': vehicle.name,
                'daily_rate': float(daily_rate)
            },
            'pickup_location': pickup_location.name,
            'return_location': return_location.name,
            'pickup_datetime': data['pickup_datetime'],
            'return_datetime': data['return_datetime'],
            'total_days': total_days,
            'daily_rate': float(daily_rate),
            'subtotal': float(subtotal),
            'insurance_type': data['insurance_type'],
            'insurance_cost': float(insurance_cost),
            'extras': extras_details,
            'extras_total': float(extras_total),
            'different_location_fee': float(different_location_fee),
            'total_price': float(total),
            'deposit': float(deposit),
            'currency': 'MAD'
        })

    @action(detail=False, methods=['get'])
    def available_vehicles(self, request):
        """Get available vehicles for given dates."""
        pickup_date = request.query_params.get('pickup_date')
        return_date = request.query_params.get('return_date')

        if not pickup_date or not return_date:
            return Response(
                {'error': 'pickup_date and return_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pickup_dt = datetime.fromisoformat(pickup_date)
            return_dt = datetime.fromisoformat(return_date)
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use ISO format.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get vehicles with active rentals in this period
        booked_vehicles = Rental.objects.filter(
            Q(pickup_datetime__lte=return_dt) & Q(return_datetime__gte=pickup_dt),
            status__in=['pending', 'confirmed', 'active']
        ).values_list('vehicle_id', flat=True)

        available_vehicles = Vehicle.objects.filter(
            service_type=Vehicle.ServiceType.RENTAL,
            is_active=True,
            status=Vehicle.Status.AVAILABLE
        ).exclude(id__in=booked_vehicles)

        from apps.vehicles.api.serializers import VehicleListSerializer
        serializer = VehicleListSerializer(available_vehicles, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update rental status."""
        rental = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(Rental.Status.choices):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        rental.status = new_status
        rental.save()

        return Response(RentalSerializer(rental).data)

    @action(detail=True, methods=['post'])
    def pickup(self, request, pk=None):
        """Record vehicle pickup."""
        rental = self.get_object()
        rental.actual_pickup_datetime = request.data.get('datetime')
        rental.pickup_mileage = request.data.get('mileage')
        rental.fuel_level_pickup = request.data.get('fuel_level')
        rental.status = Rental.Status.ACTIVE
        rental.save()

        return Response(RentalSerializer(rental).data)

    @action(detail=True, methods=['post'])
    def return_vehicle(self, request, pk=None):
        """Record vehicle return."""
        rental = self.get_object()
        rental.actual_return_datetime = request.data.get('datetime')
        rental.return_mileage = request.data.get('mileage')
        rental.fuel_level_return = request.data.get('fuel_level')
        rental.status = Rental.Status.COMPLETED
        rental.save()

        return Response(RentalSerializer(rental).data)


class RentalExtraViewSet(viewsets.ModelViewSet):
    """ViewSet for rental extras."""
    queryset = RentalExtra.objects.filter(is_active=True)
    serializer_class = RentalExtraSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class InsuranceOptionViewSet(viewsets.ModelViewSet):
    """ViewSet for insurance options."""
    queryset = InsuranceOption.objects.filter(is_active=True)
    serializer_class = InsuranceOptionSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]
