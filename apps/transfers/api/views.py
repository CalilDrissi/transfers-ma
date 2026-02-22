from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample
from decimal import Decimal
from apps.accounts.permissions import HasAPIKeyOrIsAuthenticated
from apps.transfers.models import Transfer, TransferExtra
from .serializers import (
    TransferSerializer,
    TransferCreateSerializer,
    TransferListSerializer,
    TransferExtraSerializer,
    TransferQuoteSerializer
)


@extend_schema_view(
    list=extend_schema(
        summary="List bookings",
        description="Get a list of transfer bookings. Customers see their own bookings, admins see all.",
        tags=['Booking'],
    ),
    retrieve=extend_schema(
        summary="Get booking details",
        description="Get detailed information about a specific booking.",
        tags=['Booking'],
    ),
    create=extend_schema(
        summary="Create a booking",
        description="""
        Create a new transfer booking. This endpoint is public - no authentication required.

        **Required fields:**
        - pickup/dropoff addresses and coordinates
        - pickup datetime
        - vehicle category
        - customer contact info (name, email, phone)

        **Optional fields:**
        - extras (array of {extra_id, quantity})
        - is_round_trip
        - return datetime (if round trip)
        - flight number
        - special requests
        """,
        tags=['Booking'],
    ),
    update=extend_schema(
        summary="Update booking",
        description="Update a booking (admin only).",
        tags=['Booking'],
    ),
    partial_update=extend_schema(
        summary="Partially update booking",
        description="Partially update a booking (admin only).",
        tags=['Booking'],
    ),
    destroy=extend_schema(
        summary="Delete booking",
        description="Delete a booking (admin only).",
        tags=['Booking'],
    ),
)
class TransferViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing transfer bookings.

    - Public: Create bookings and get quotes
    - Authenticated: View your own bookings
    - Admin: Full access to all bookings
    """
    queryset = Transfer.objects.select_related(
        'vehicle_category', 'customer'
    ).prefetch_related('booked_extras__extra')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'transfer_type', 'vehicle_category', 'is_round_trip']
    search_fields = ['booking_ref', 'customer_name', 'customer_email', 'flight_number']
    ordering_fields = ['pickup_datetime', 'created_at', 'total_price']

    def get_permissions(self):
        if self.action in ['create', 'quote']:
            return [HasAPIKeyOrIsAuthenticated()]
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_serializer_class(self):
        if self.action == 'list':
            return TransferListSerializer
        if self.action == 'create':
            return TransferCreateSerializer
        if self.action == 'quote':
            return TransferQuoteSerializer
        return TransferSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Transfer.objects.select_related(
            'vehicle_category', 'customer'
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

    @extend_schema(
        summary="Get a price quote",
        description="""
        Calculate a price quote for a transfer without creating a booking.

        Provide the pickup and dropoff locations, vehicle category, and any extras.
        The API will calculate the distance using Google Maps and return the total price.

        **Note:** This is a public endpoint, no authentication required.
        """,
        tags=['Booking'],
        request=TransferQuoteSerializer,
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'pickup_address': {'type': 'string'},
                    'dropoff_address': {'type': 'string'},
                    'distance_km': {'type': 'number', 'nullable': True},
                    'duration_minutes': {'type': 'integer', 'nullable': True},
                    'vehicle_category': {'type': 'string'},
                    'base_price': {'type': 'number'},
                    'extras': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'name': {'type': 'string'},
                                'quantity': {'type': 'integer'},
                                'price': {'type': 'number'},
                            }
                        }
                    },
                    'extras_total': {'type': 'number'},
                    'is_round_trip': {'type': 'boolean'},
                    'multiplier': {'type': 'integer'},
                    'total_price': {'type': 'number'},
                    'currency': {'type': 'string', 'example': 'MAD'},
                }
            }
        },
        examples=[
            OpenApiExample(
                'Quote Request',
                value={
                    'pickup_address': 'Marrakech Airport',
                    'pickup_latitude': 31.6069,
                    'pickup_longitude': -8.0363,
                    'dropoff_address': 'Jemaa el-Fnaa, Marrakech',
                    'dropoff_latitude': 31.6258,
                    'dropoff_longitude': -7.9891,
                    'vehicle_category_id': 1,
                    'is_round_trip': False,
                    'extras': [{'extra_id': 1, 'quantity': 2}]
                },
                request_only=True,
            ),
        ]
    )
    @action(detail=False, methods=['post'])
    def quote(self, request):
        """Get a price quote for a transfer."""
        serializer = TransferQuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.vehicles.models import VehicleCategory
        from apps.locations.services import calculate_distance

        data = serializer.validated_data
        vehicle_category = VehicleCategory.objects.get(id=data['vehicle_category_id'])

        # Calculate distance
        distance_km = None
        duration_minutes = None
        try:
            distance_result = calculate_distance(
                float(data['pickup_latitude']),
                float(data['pickup_longitude']),
                float(data['dropoff_latitude']),
                float(data['dropoff_longitude'])
            )
            distance_km = distance_result.get('distance_km')
            duration_minutes = distance_result.get('duration_minutes')
        except Exception:
            pass

        # Calculate base price
        base_price = self._calculate_price(distance_km, vehicle_category)

        # Calculate extras
        extras_total = Decimal('0')
        extras_details = []
        for extra_data in data.get('extras', []):
            extra = TransferExtra.objects.get(id=extra_data['extra_id'])
            quantity = extra_data.get('quantity', 1)
            price = extra.price * quantity if extra.is_per_item else extra.price
            extras_total += price
            extras_details.append({
                'name': extra.name,
                'quantity': quantity,
                'price': float(price)
            })

        # Calculate round trip if applicable
        multiplier = 2 if data.get('is_round_trip') else 1

        total = (base_price + extras_total) * multiplier

        # Look up deposit percentage from matching Route or Zone
        deposit_percentage = Decimal('0')
        deposit_amount = Decimal('0')

        from apps.locations.models import Route, Zone

        pickup_lat = float(data['pickup_latitude'])
        pickup_lng = float(data['pickup_longitude'])
        dropoff_lat = float(data['dropoff_latitude'])
        dropoff_lng = float(data['dropoff_longitude'])

        # Try to match a route first
        matched_route = None
        for route in Route.objects.filter(is_active=True):
            if route.origin_latitude and route.origin_longitude and route.destination_latitude and route.destination_longitude:
                from apps.locations.services import calculate_distance_haversine
                origin_dist = float(calculate_distance_haversine(pickup_lat, pickup_lng, float(route.origin_latitude), float(route.origin_longitude)))
                dest_dist = float(calculate_distance_haversine(dropoff_lat, dropoff_lng, float(route.destination_latitude), float(route.destination_longitude)))
                if origin_dist <= float(route.origin_radius_km) and dest_dist <= float(route.destination_radius_km):
                    matched_route = route
                    break
                # Check reverse direction if bidirectional
                if route.is_bidirectional:
                    origin_dist_rev = float(calculate_distance_haversine(pickup_lat, pickup_lng, float(route.destination_latitude), float(route.destination_longitude)))
                    dest_dist_rev = float(calculate_distance_haversine(dropoff_lat, dropoff_lng, float(route.origin_latitude), float(route.origin_longitude)))
                    if origin_dist_rev <= float(route.destination_radius_km) and dest_dist_rev <= float(route.origin_radius_km):
                        matched_route = route
                        break

        if matched_route and matched_route.deposit_percentage > 0:
            deposit_percentage = matched_route.deposit_percentage
        else:
            # Try to match a zone by pickup coordinates
            for zone in Zone.objects.filter(is_active=True, center_latitude__isnull=False):
                from apps.locations.services import calculate_distance_haversine
                dist = float(calculate_distance_haversine(pickup_lat, pickup_lng, float(zone.center_latitude), float(zone.center_longitude)))
                if dist <= float(zone.radius_km) and zone.deposit_percentage > 0:
                    deposit_percentage = zone.deposit_percentage
                    break

        if deposit_percentage > 0:
            deposit_amount = (total * deposit_percentage / Decimal('100')).quantize(Decimal('0.01'))

        return Response({
            'pickup_address': data['pickup_address'],
            'dropoff_address': data['dropoff_address'],
            'distance_km': float(distance_km) if distance_km else None,
            'duration_minutes': duration_minutes,
            'vehicle_category': vehicle_category.name,
            'base_price': float(base_price),
            'extras': extras_details,
            'extras_total': float(extras_total),
            'is_round_trip': data.get('is_round_trip', False),
            'multiplier': multiplier,
            'total_price': float(total),
            'deposit_percentage': float(deposit_percentage),
            'deposit_amount': float(deposit_amount),
            'currency': 'MAD'
        })

    def _calculate_price(self, distance_km, vehicle_category):
        """Calculate base price based on distance and vehicle category."""
        if distance_km is None:
            return Decimal('500') * vehicle_category.price_multiplier

        # Base rate per km
        base_rate_per_km = Decimal('5')  # 5 MAD per km
        minimum_price = Decimal('100')   # Minimum 100 MAD

        calculated_price = distance_km * base_rate_per_km * vehicle_category.price_multiplier
        return max(calculated_price, minimum_price)

    @action(detail=True, methods=['post'])
    def assign_driver(self, request, pk=None):
        """Assign a driver to a transfer (admin only)."""
        transfer = self.get_object()
        driver_id = request.data.get('driver_id')
        vehicle_id = request.data.get('vehicle_id')

        from django.contrib.auth import get_user_model
        from apps.vehicles.models import Vehicle

        User = get_user_model()

        if driver_id:
            driver = User.objects.get(id=driver_id, role='driver')
            transfer.driver = driver

        if vehicle_id:
            vehicle = Vehicle.objects.get(id=vehicle_id)
            transfer.vehicle = vehicle

        transfer.status = Transfer.Status.ASSIGNED
        transfer.save()

        return Response(TransferSerializer(transfer).data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update transfer status."""
        transfer = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(Transfer.Status.choices):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        transfer.status = new_status
        transfer.save()

        # Send status update email
        try:
            from apps.notifications.tasks import send_status_update
            send_status_update.delay(
                booking_ref=transfer.booking_ref,
                customer_email=transfer.customer_email,
                customer_name=transfer.customer_name,
                new_status=new_status,
            )
        except Exception:
            pass

        return Response(TransferSerializer(transfer).data)


@extend_schema_view(
    list=extend_schema(
        summary="List available extras",
        description="""
        Get all available transfer add-ons/extras.

        Examples include:
        - Child seats (per item pricing)
        - Meet & greet service
        - Extra luggage
        - Wifi hotspot
        """,
        tags=['Extras'],
    ),
    retrieve=extend_schema(
        summary="Get extra details",
        description="Get details of a specific extra/add-on.",
        tags=['Extras'],
    ),
)
class TransferExtraViewSet(viewsets.ModelViewSet):
    """
    ViewSet for transfer extras/add-ons.

    Extras are additional services that can be added to a transfer booking.
    Public can list/view, only admins can create/update/delete.

    Accepts optional ?vehicle_category_id=X to filter extras for a specific
    vehicle category. Returns extras linked to that category plus extras
    with no categories assigned (universal extras).
    """
    queryset = TransferExtra.objects.filter(is_active=True)
    serializer_class = TransferExtraSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        cat_id = self.request.query_params.get('vehicle_category_id')
        if cat_id:
            from django.db.models import Q
            qs = qs.filter(
                Q(vehicle_categories__id=cat_id) | Q(vehicle_categories__isnull=True)
            ).distinct()
        return qs
