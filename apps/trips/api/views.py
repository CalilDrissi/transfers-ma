from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from apps.trips.models import Trip, TripSchedule, TripBooking
from apps.accounts.permissions import HasAPIKeyOrIsAuthenticated
from .serializers import (
    TripSerializer,
    TripListSerializer,
    TripScheduleSerializer,
    TripBookingSerializer,
    TripBookingCreateSerializer,
    TripBookingListSerializer
)


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class TripViewSet(viewsets.ModelViewSet):
    """ViewSet for trips/tours."""
    queryset = Trip.objects.prefetch_related('images', 'schedules', 'destinations')
    permission_classes = [HasAPIKeyOrIsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['trip_type', 'is_featured', 'is_active', 'departure_location']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price_per_person', 'order', 'created_at']
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'list':
            return TripListSerializer
        return TripSerializer

    def get_queryset(self):
        queryset = Trip.objects.prefetch_related('images', 'schedules', 'destinations')
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured trips."""
        trips = self.get_queryset().filter(is_featured=True)[:6]
        serializer = TripListSerializer(trips, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def schedules(self, request, slug=None):
        """Get available schedules for a trip."""
        trip = self.get_object()
        schedules = trip.schedules.filter(is_active=True)
        serializer = TripScheduleSerializer(schedules, many=True)
        return Response(serializer.data)


class TripBookingViewSet(viewsets.ModelViewSet):
    """ViewSet for trip bookings."""
    queryset = TripBooking.objects.select_related('trip', 'customer', 'pickup_location')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'trip', 'is_private', 'trip_date']
    search_fields = ['booking_ref', 'customer_name', 'customer_email']
    ordering_fields = ['trip_date', 'created_at', 'total_price']

    def get_permissions(self):
        if self.action == 'create':
            return [HasAPIKeyOrIsAuthenticated()]
        if self.action in ['list', 'retrieve']:
            return [HasAPIKeyOrIsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_serializer_class(self):
        if self.action == 'list':
            return TripBookingListSerializer
        if self.action == 'create':
            return TripBookingCreateSerializer
        return TripBookingSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = TripBooking.objects.select_related('trip', 'customer', 'pickup_location')

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

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update booking status."""
        booking = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(TripBooking.Status.choices):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = new_status
        booking.save()

        return Response(TripBookingSerializer(booking).data)
