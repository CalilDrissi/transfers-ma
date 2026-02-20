from decimal import Decimal
from math import radians, cos, sin, asin, sqrt

from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes as perm_classes, action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from apps.accounts.permissions import HasAPIKeyOrIsAuthenticated

from apps.locations.models import Zone, ZonePricing, Route, RoutePickupZone, RouteDropoffZone
from apps.locations.services import calculate_distance, DistanceCalculationError
from .serializers import (
    ZoneSerializer,
    ZoneListSerializer,
    ZonePricingSerializer,
    RouteListSerializer,
    RouteDetailSerializer,
    RouteSearchSerializer,
    RouteWithPricingSerializer,
    RoutePickupZoneSerializer,
    RouteDropoffZoneSerializer
)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow read access to anyone, write access to admins only."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class ZoneViewSet(viewsets.ModelViewSet):
    """ViewSet for managing zones."""
    queryset = Zone.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'list':
            return ZoneListSerializer
        return ZoneSerializer

    def get_queryset(self):
        queryset = Zone.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset


class ZonePricingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing zone pricing."""
    queryset = ZonePricing.objects.select_related('from_zone', 'to_zone', 'vehicle_category')
    serializer_class = ZonePricingSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['from_zone', 'to_zone', 'vehicle_category', 'is_active']


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points using Haversine formula."""
    R = 6371  # Earth's radius in km

    lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))

    return R * c


def find_matching_pickup_zone(route, lat, lng):
    """Find the pickup zone that contains the given coordinates."""
    pickup_zones = route.pickup_zones.filter(is_active=True)
    if not pickup_zones.exists():
        return None

    for zone in pickup_zones:
        distance = haversine_distance(lat, lng, zone.center_latitude, zone.center_longitude)
        if distance <= float(zone.radius_km):
            return zone
    return None


def find_matching_dropoff_zone(route, lat, lng):
    """Find the dropoff zone that contains the given coordinates."""
    dropoff_zones = route.dropoff_zones.filter(is_active=True)
    if not dropoff_zones.exists():
        return None

    for zone in dropoff_zones:
        distance = haversine_distance(lat, lng, zone.center_latitude, zone.center_longitude)
        if distance <= float(zone.radius_km):
            return zone
    return None


def find_matching_zone(lat, lng):
    """Find the standalone Zone containing the given coordinates."""
    for zone in Zone.objects.filter(is_active=True):
        if not zone.has_coordinates:
            continue
        distance = haversine_distance(lat, lng, zone.center_latitude, zone.center_longitude)
        if distance <= float(zone.radius_km):
            return zone
    return None


def _build_zone_vehicle_option(zone_pricing):
    """Build a vehicle option dict from a VehicleZonePricing record."""
    vehicle = zone_pricing.vehicle
    category = vehicle.category
    primary_image = vehicle.images.filter(is_primary=True).first()
    return {
        'vehicle_id': vehicle.id,
        'vehicle_name': vehicle.name,
        'category_id': category.id,
        'category_name': category.name,
        'category_icon': category.icon,
        'category_description': category.description or '',
        'category_tagline': category.tagline or '',
        'category_included_amenities': category.included_amenities or [],
        'category_not_included': category.not_included or [],
        'category_image': category.image.url if category.image else None,
        'passengers': vehicle.passengers,
        'luggage': vehicle.luggage,
        'price': float(zone_pricing.price),
        'features': [f.name for f in vehicle.features.all()[:4]],
        'image': primary_image.image.url if primary_image else None,
        'client_description': vehicle.client_description or '',
        'key_features': vehicle.key_features or [],
        'important_note': vehicle.important_note or '',
        'important_note_type': vehicle.important_note_type or 'info',
        'custom_info': vehicle.custom_info or {},
        'pricing_type': 'zone',
        'min_booking_hours': zone_pricing.min_booking_hours,
    }


@extend_schema_view(
    list=extend_schema(
        summary="List all routes",
        description="Get a list of all available transfer routes. Popular routes are marked with `is_popular=true`.",
        tags=['Routes'],
        responses={200: RouteListSerializer(many=True)},
    ),
    retrieve=extend_schema(
        summary="Get route details",
        description="Get detailed information about a specific route including vehicle pricing.",
        tags=['Routes'],
        responses={200: RouteDetailSerializer},
    ),
)
class RouteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for browsing transfer routes.

    Routes are pre-defined origin-destination pairs with fixed pricing per vehicle.
    This is useful for popular routes like airport transfers or inter-city travel.
    """
    queryset = Route.objects.filter(is_active=True).prefetch_related(
        'pickup_zones',
        'dropoff_zones',
        'vehicle_pricing',
        'vehicle_pricing__vehicle',
        'vehicle_pricing__vehicle__category',
        'vehicle_pricing__vehicle__images',
        'vehicle_pricing__vehicle__features',
        'vehicle_pricing__pickup_zone',
        'vehicle_pricing__dropoff_zone'
    )

    lookup_field = 'slug'

    def get_permissions(self):
        # Public-facing actions don't require authentication
        if self.action in ('get_pricing', 'popular', 'search'):
            return [permissions.AllowAny()]
        return [HasAPIKeyOrIsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return RouteListSerializer
        return RouteDetailSerializer

    @extend_schema(
        summary="Get popular routes",
        description="Get a list of popular routes that should be displayed prominently.",
        tags=['Routes'],
        responses={200: RouteListSerializer(many=True)},
    )
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Return only popular routes."""
        queryset = self.get_queryset().filter(is_popular=True)
        serializer = RouteListSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Search routes by coordinates",
        description="""
        Search for matching routes based on pickup and dropoff coordinates.

        The API will find routes where:
        - The pickup location is within the route's origin radius
        - The dropoff location is within the route's destination radius

        For bidirectional routes, reverse matches are also returned.
        """,
        tags=['Routes'],
        parameters=[
            OpenApiParameter(
                name='origin_lat',
                type=OpenApiTypes.DECIMAL,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Pickup location latitude'
            ),
            OpenApiParameter(
                name='origin_lng',
                type=OpenApiTypes.DECIMAL,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Pickup location longitude'
            ),
            OpenApiParameter(
                name='destination_lat',
                type=OpenApiTypes.DECIMAL,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Dropoff location latitude'
            ),
            OpenApiParameter(
                name='destination_lng',
                type=OpenApiTypes.DECIMAL,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Dropoff location longitude'
            ),
        ],
        responses={200: RouteDetailSerializer(many=True)},
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for routes matching the given coordinates."""
        serializer = RouteSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        origin_lat = serializer.validated_data['origin_lat']
        origin_lng = serializer.validated_data['origin_lng']
        dest_lat = serializer.validated_data['destination_lat']
        dest_lng = serializer.validated_data['destination_lng']

        matching_routes = []

        for route in self.get_queryset():
            # Check if origin is within route's origin radius
            origin_distance = haversine_distance(
                origin_lat, origin_lng,
                route.origin_latitude, route.origin_longitude
            )
            dest_distance = haversine_distance(
                dest_lat, dest_lng,
                route.destination_latitude, route.destination_longitude
            )

            if (origin_distance <= float(route.origin_radius_km) and
                dest_distance <= float(route.destination_radius_km)):
                # Find matching zones within the route
                pickup_zone = find_matching_pickup_zone(route, origin_lat, origin_lng)
                dropoff_zone = find_matching_dropoff_zone(route, dest_lat, dest_lng)
                matching_routes.append({
                    'route': route,
                    'direction': 'forward',
                    'origin_distance_km': round(origin_distance, 2),
                    'destination_distance_km': round(dest_distance, 2),
                    'matched_pickup_zone': pickup_zone,
                    'matched_dropoff_zone': dropoff_zone
                })

            # Check reverse direction for bidirectional routes
            elif route.is_bidirectional:
                origin_to_dest = haversine_distance(
                    origin_lat, origin_lng,
                    route.destination_latitude, route.destination_longitude
                )
                dest_to_origin = haversine_distance(
                    dest_lat, dest_lng,
                    route.origin_latitude, route.origin_longitude
                )

                if (origin_to_dest <= float(route.destination_radius_km) and
                    dest_to_origin <= float(route.origin_radius_km)):
                    # For reverse direction, pickup is from destination zones, dropoff is from origin zones
                    pickup_zone = find_matching_dropoff_zone(route, origin_lat, origin_lng)
                    dropoff_zone = find_matching_pickup_zone(route, dest_lat, dest_lng)
                    matching_routes.append({
                        'route': route,
                        'direction': 'reverse',
                        'origin_distance_km': round(origin_to_dest, 2),
                        'destination_distance_km': round(dest_to_origin, 2),
                        'matched_pickup_zone': pickup_zone,
                        'matched_dropoff_zone': dropoff_zone
                    })

        # Build response with route data and match info
        results = []
        for match in matching_routes:
            route_data = RouteDetailSerializer(match['route']).data
            route_data['match_direction'] = match['direction']
            route_data['pickup_distance_km'] = match['origin_distance_km']
            route_data['dropoff_distance_km'] = match['destination_distance_km']
            # Include matched zones
            if match['matched_pickup_zone']:
                route_data['matched_pickup_zone'] = RoutePickupZoneSerializer(match['matched_pickup_zone']).data
            else:
                route_data['matched_pickup_zone'] = None
            if match['matched_dropoff_zone']:
                route_data['matched_dropoff_zone'] = RouteDropoffZoneSerializer(match['matched_dropoff_zone']).data
            else:
                route_data['matched_dropoff_zone'] = None
            results.append(route_data)

        return Response(results)

    @extend_schema(
        summary="Get vehicle options with pricing",
        description="""
        Search for a route and get all available vehicle options with prices.

        This is the main endpoint for the booking flow:
        1. User enters pickup/dropoff locations
        2. API finds matching routes or calculates distance
        3. Returns all available vehicles with prices

        The response includes route details plus a list of vehicle options sorted by price.
        """,
        tags=['Routes'],
        parameters=[
            OpenApiParameter(
                name='origin_lat',
                type=OpenApiTypes.DECIMAL,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Pickup location latitude'
            ),
            OpenApiParameter(
                name='origin_lng',
                type=OpenApiTypes.DECIMAL,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Pickup location longitude'
            ),
            OpenApiParameter(
                name='destination_lat',
                type=OpenApiTypes.DECIMAL,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Dropoff location latitude'
            ),
            OpenApiParameter(
                name='destination_lng',
                type=OpenApiTypes.DECIMAL,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Dropoff location longitude'
            ),
            OpenApiParameter(
                name='passengers',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Number of passengers (for filtering)'
            ),
        ],
        responses={200: RouteWithPricingSerializer},
    )
    @action(detail=False, methods=['get'])
    def get_pricing(self, request):
        """Get vehicle pricing options for a route search."""
        from apps.vehicles.models import VehicleCategory

        serializer = RouteSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        origin_lat = serializer.validated_data['origin_lat']
        origin_lng = serializer.validated_data['origin_lng']
        dest_lat = serializer.validated_data['destination_lat']
        dest_lng = serializer.validated_data['destination_lng']
        passengers = int(request.query_params.get('passengers', 1))

        # Step 1: Check if both points are in the same Zone (within-city transfer)
        pickup_zone = find_matching_zone(origin_lat, origin_lng)
        dropoff_zone = find_matching_zone(dest_lat, dest_lng)

        if pickup_zone and dropoff_zone and pickup_zone.id == dropoff_zone.id:
            zone = pickup_zone
            # Calculate driving distance
            distance_km = float(haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng))
            duration_minutes = None
            try:
                dist_result = calculate_distance(float(origin_lat), float(origin_lng), float(dest_lat), float(dest_lng))
                if dist_result.get('distance_km'):
                    distance_km = float(dist_result['distance_km'])
                    duration_minutes = dist_result.get('duration_minutes')
            except Exception:
                pass
            if duration_minutes is None:
                duration_minutes = int(distance_km * 1.5)

            # Find matching distance range
            distance_range = zone.get_range_for_distance(distance_km)
            if distance_range:
                from apps.vehicles.models import VehicleZonePricing
                zone_vehicle_pricing = VehicleZonePricing.objects.filter(
                    zone_distance_range=distance_range,
                    is_active=True
                ).select_related('vehicle', 'vehicle__category')

                if zone_vehicle_pricing.exists():
                    vehicle_options = []
                    for zp in zone_vehicle_pricing:
                        vehicle_options.append(_build_zone_vehicle_option(zp))

                    min_hours_values = [zp.min_booking_hours for zp in zone_vehicle_pricing if zp.min_booking_hours]
                    return Response({
                        'id': None,
                        'name': zone.name,
                        'pricing_type': 'zone',
                        'deposit_percentage': float(zone.deposit_percentage),
                        'origin_name': request.query_params.get('origin_name', 'Pickup'),
                        'destination_name': request.query_params.get('destination_name', 'Dropoff'),
                        'distance_km': round(distance_km, 1),
                        'estimated_duration_minutes': duration_minutes,
                        'duration_display': f"{duration_minutes // 60}h {duration_minutes % 60}min",
                        'client_notice': zone.client_notice,
                        'client_notice_type': zone.client_notice_type,
                        'custom_info': zone.custom_info,
                        'min_booking_hours': min(min_hours_values) if min_hours_values else None,
                        'vehicle_options': sorted(vehicle_options, key=lambda x: x['price']),
                    })
        # If no zone match or no pricing → fall through to Route check

        # Step 2: Try to find a matching route
        matching_route = None
        matched_pickup_zone = None
        matched_dropoff_zone = None
        is_reverse = False

        for route in self.get_queryset():
            origin_distance = haversine_distance(
                origin_lat, origin_lng,
                route.origin_latitude, route.origin_longitude
            )
            dest_distance = haversine_distance(
                dest_lat, dest_lng,
                route.destination_latitude, route.destination_longitude
            )

            if (origin_distance <= float(route.origin_radius_km) and
                dest_distance <= float(route.destination_radius_km)):
                matching_route = route
                matched_pickup_zone = find_matching_pickup_zone(route, origin_lat, origin_lng)
                matched_dropoff_zone = find_matching_dropoff_zone(route, dest_lat, dest_lng)
                break

            # Check reverse for bidirectional
            elif route.is_bidirectional:
                origin_to_dest = haversine_distance(
                    origin_lat, origin_lng,
                    route.destination_latitude, route.destination_longitude
                )
                dest_to_origin = haversine_distance(
                    dest_lat, dest_lng,
                    route.origin_latitude, route.origin_longitude
                )

                if (origin_to_dest <= float(route.destination_radius_km) and
                    dest_to_origin <= float(route.origin_radius_km)):
                    matching_route = route
                    is_reverse = True
                    # For reverse, pickup from dropoff zones and vice versa
                    matched_pickup_zone = find_matching_dropoff_zone(route, origin_lat, origin_lng)
                    matched_dropoff_zone = find_matching_pickup_zone(route, dest_lat, dest_lng)
                    break

        if matching_route:
            # Use route-based pricing with zone-specific prices if available
            data = RouteWithPricingSerializer(
                matching_route,
                context={
                    'matched_pickup_zone': matched_pickup_zone,
                    'matched_dropoff_zone': matched_dropoff_zone,
                    'is_reverse': is_reverse
                }
            ).data
            data['pricing_type'] = 'route'
            # Compute route-level min_booking_hours (smallest non-null across vehicle options)
            min_hours_values = [
                v['min_booking_hours'] for v in data.get('vehicle_options', [])
                if v.get('min_booking_hours') is not None
            ]
            data['min_booking_hours'] = min(min_hours_values) if min_hours_values else None
            if matched_pickup_zone:
                data['matched_pickup_zone'] = RoutePickupZoneSerializer(matched_pickup_zone).data
            else:
                data['matched_pickup_zone'] = None
            if matched_dropoff_zone:
                data['matched_dropoff_zone'] = RouteDropoffZoneSerializer(matched_dropoff_zone).data
            else:
                data['matched_dropoff_zone'] = None
            return Response(data)

        # No matching route - calculate distance and use category pricing
        distance_km = float(haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng))
        duration_minutes = None

        # Try to get actual driving distance
        try:
            distance_result = calculate_distance(
                float(origin_lat), float(origin_lng),
                float(dest_lat), float(dest_lng)
            )
            if distance_result.get('distance_km'):
                distance_km = float(distance_result['distance_km'])
                duration_minutes = distance_result.get('duration_minutes')
        except Exception:
            pass

        if duration_minutes is None:
            duration_minutes = int(distance_km * 1.5)  # Estimate 40 km/h average

        # Build vehicle options from categories
        vehicle_options = []
        for category in VehicleCategory.objects.filter(
            is_active=True,
            max_passengers__gte=passengers
        ).order_by('order'):
            base_price = Decimal(str(distance_km)) * Decimal('5') * category.price_multiplier
            price = max(base_price, Decimal('100'))
            vehicle_options.append({
                'vehicle_id': None,
                'vehicle_name': category.name,
                'category_id': category.id,
                'category_name': category.name,
                'category_icon': category.icon or 'bi bi-car-front',
                'category_description': category.description or '',
                'category_image': category.image.url if category.image else None,
                'passengers': category.max_passengers,
                'luggage': category.max_luggage,
                'price': float(price),
                'features': [],
                'image': category.image.url if category.image else None,
                'custom_info': {}
            })

        return Response({
            'id': None,
            'name': 'Custom Route',
            'pricing_type': 'calculated',
            'custom_info': {},
            'deposit_percentage': 0,
            'origin_name': request.query_params.get('origin_name', 'Pickup'),
            'destination_name': request.query_params.get('destination_name', 'Dropoff'),
            'distance_km': round(distance_km, 1),
            'estimated_duration_minutes': duration_minutes,
            'duration_display': f"{duration_minutes // 60}h {duration_minutes % 60}min",
            'vehicle_options': sorted(vehicle_options, key=lambda x: x['price'])
        })


@extend_schema(
    summary="Calculate distance between two points",
    description="""
    Calculate driving distance and duration between two geographic points using Google Distance Matrix API.

    This is useful for zone-based pricing where the price depends on the actual driving distance.
    """,
    tags=['Locations'],
    parameters=[
        OpenApiParameter(
            name='origin_lat',
            type=OpenApiTypes.DECIMAL,
            location=OpenApiParameter.QUERY,
            required=True,
            description='Origin latitude'
        ),
        OpenApiParameter(
            name='origin_lng',
            type=OpenApiTypes.DECIMAL,
            location=OpenApiParameter.QUERY,
            required=True,
            description='Origin longitude'
        ),
        OpenApiParameter(
            name='dest_lat',
            type=OpenApiTypes.DECIMAL,
            location=OpenApiParameter.QUERY,
            required=True,
            description='Destination latitude'
        ),
        OpenApiParameter(
            name='dest_lng',
            type=OpenApiTypes.DECIMAL,
            location=OpenApiParameter.QUERY,
            required=True,
            description='Destination longitude'
        ),
    ],
    responses={
        200: {
            'type': 'object',
            'properties': {
                'distance_km': {'type': 'number', 'example': 45.5},
                'distance_text': {'type': 'string', 'example': '45.5 km'},
                'duration_minutes': {'type': 'integer', 'example': 55},
                'duration_text': {'type': 'string', 'example': '55 mins'},
                'source': {'type': 'string', 'example': 'google'},
            }
        },
        400: {'description': 'Invalid parameters'},
        503: {'description': 'Distance calculation service unavailable'},
    },
)
@api_view(['GET', 'POST'])
@perm_classes([HasAPIKeyOrIsAuthenticated])
def calculate_distance_view(request):
    """
    Calculate driving distance between two points using Google Distance Matrix API.

    GET/POST Parameters:
        - origin_lat: Origin latitude
        - origin_lng: Origin longitude
        - dest_lat: Destination latitude
        - dest_lng: Destination longitude

    Returns:
        {
            "distance_km": 45.5,
            "distance_text": "45.5 km",
            "duration_minutes": 55,
            "duration_text": "55 mins",
            "source": "google"
        }
    """
    data = request.data if request.method == 'POST' else request.query_params

    origin_lat = data.get('origin_lat')
    origin_lng = data.get('origin_lng')
    dest_lat = data.get('dest_lat')
    dest_lng = data.get('dest_lng')

    if not all([origin_lat, origin_lng, dest_lat, dest_lng]):
        return Response(
            {'error': 'Missing required parameters: origin_lat, origin_lng, dest_lat, dest_lng'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        result = calculate_distance(
            float(origin_lat),
            float(origin_lng),
            float(dest_lat),
            float(dest_lng)
        )
        return Response(result)

    except (ValueError, TypeError) as e:
        return Response(
            {'error': f'Invalid coordinate values: {e}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except DistanceCalculationError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@extend_schema(
    summary="Get Google Maps API configuration",
    description="Get the Google Maps API key for frontend use (Places Autocomplete, Maps, etc.)",
    tags=['Locations'],
    responses={
        200: {
            'type': 'object',
            'properties': {
                'api_key': {'type': 'string', 'description': 'Google Maps API key'},
                'enabled': {'type': 'boolean', 'description': 'Whether Google Maps is enabled'},
            }
        }
    },
)
@api_view(['GET'])
@perm_classes([HasAPIKeyOrIsAuthenticated])
def google_maps_config(request):
    """
    Get Google Maps API configuration for frontend use.

    Returns the API key needed for Google Places Autocomplete and Maps integration.
    """
    api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', '')
    return Response({
        'api_key': api_key,
        'enabled': bool(api_key),
    })
