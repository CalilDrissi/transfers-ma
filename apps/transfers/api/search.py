from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q


class UnifiedSearchView(APIView):
    """Search across transfers, routes, and trips."""

    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        search_type = request.query_params.get('type', 'all')

        if not query or len(query) < 2:
            return Response(
                {'error': {'code': 'validation_error', 'message': 'Query must be at least 2 characters.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = {}

        if search_type in ('all', 'transfers'):
            from apps.transfers.models import Transfer
            transfers = Transfer.objects.filter(
                Q(booking_ref__icontains=query) |
                Q(customer_name__icontains=query) |
                Q(customer_email__icontains=query) |
                Q(pickup_address__icontains=query) |
                Q(dropoff_address__icontains=query)
            ).values(
                'id', 'booking_ref', 'customer_name', 'pickup_address',
                'dropoff_address', 'status', 'total_price', 'created_at',
            )[:20]
            results['transfers'] = list(transfers)

        if search_type in ('all', 'routes'):
            from apps.locations.models import Route
            routes = Route.objects.filter(
                Q(name__icontains=query) |
                Q(origin_name__icontains=query) |
                Q(destination_name__icontains=query)
            ).filter(is_active=True).values(
                'id', 'name', 'slug', 'origin_name', 'destination_name',
                'distance_km',
            )[:20]
            results['routes'] = list(routes)

        if search_type in ('all', 'trips'):
            from apps.trips.models import Trip
            trips = Trip.objects.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(short_description__icontains=query)
            ).filter(is_active=True).values(
                'id', 'name', 'slug', 'short_description',
            )[:20]
            results['trips'] = list(trips)

        return Response(results)


class TransferByRefView(APIView):
    """Look up a transfer by booking reference."""

    permission_classes = [AllowAny]

    def get(self, request, ref):
        from apps.transfers.models import Transfer
        from apps.transfers.api.serializers import TransferSerializer

        try:
            transfer = Transfer.objects.select_related(
                'vehicle_category', 'customer'
            ).prefetch_related('booked_extras__extra').get(booking_ref=ref)
        except Transfer.DoesNotExist:
            return Response(
                {'error': {'code': 'not_found', 'message': 'Transfer not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(TransferSerializer(transfer).data)
