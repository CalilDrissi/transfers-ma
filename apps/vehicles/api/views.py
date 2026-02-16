from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from apps.vehicles.models import VehicleCategory, VehicleFeature, Vehicle, VehicleImage
from .serializers import (
    VehicleCategorySerializer,
    VehicleFeatureSerializer,
    VehicleSerializer,
    VehicleListSerializer,
    VehicleImageSerializer
)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow read access to anyone, write access to admins only."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


@extend_schema_view(
    list=extend_schema(
        summary="List vehicle categories",
        description="""
        Get all available vehicle categories.

        Categories define the type of vehicle (e.g., Sedan, SUV, Van, Minibus).
        Each category has a name, icon, and can be used for pricing.
        """,
        tags=['Vehicles'],
    ),
    retrieve=extend_schema(
        summary="Get category details",
        description="Get details of a specific vehicle category.",
        tags=['Vehicles'],
    ),
)
class VehicleCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for vehicle categories.

    Categories are used to group vehicles by type and apply consistent pricing.
    """
    queryset = VehicleCategory.objects.filter(is_active=True)
    serializer_class = VehicleCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = VehicleCategory.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset


@extend_schema_view(
    list=extend_schema(
        summary="List vehicle features",
        description="Get all available vehicle features (e.g., Air conditioning, WiFi, USB charging).",
        tags=['Vehicles'],
    ),
    retrieve=extend_schema(
        summary="Get feature details",
        description="Get details of a specific vehicle feature.",
        tags=['Vehicles'],
    ),
)
class VehicleFeatureViewSet(viewsets.ModelViewSet):
    """ViewSet for vehicle features."""
    queryset = VehicleFeature.objects.filter(is_active=True)
    serializer_class = VehicleFeatureSerializer
    permission_classes = [IsAdminOrReadOnly]


@extend_schema_view(
    list=extend_schema(
        summary="List vehicles",
        description="""
        Get all available vehicles.

        For customers, only active and available vehicles are shown.
        Admins can see all vehicles regardless of status.

        **Filters:**
        - category: Filter by vehicle category
        - status: Filter by vehicle status
        - is_active: Filter active/inactive vehicles

        **Search:**
        - Search by name or license plate
        """,
        tags=['Vehicles'],
    ),
    retrieve=extend_schema(
        summary="Get vehicle details",
        description="Get detailed information about a specific vehicle including features and images.",
        tags=['Vehicles'],
    ),
)
class VehicleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for vehicles.

    Vehicles are individual cars/vans that can be booked for transfers.
    """
    queryset = Vehicle.objects.select_related('category').prefetch_related('features', 'images')
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'status', 'is_active', 'service_type']
    search_fields = ['name', 'license_plate']
    ordering_fields = ['name', 'created_at', 'daily_rate']

    def get_serializer_class(self):
        if self.action == 'list':
            return VehicleListSerializer
        return VehicleSerializer

    def get_queryset(self):
        queryset = Vehicle.objects.select_related('category').prefetch_related('features', 'images')
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True, status=Vehicle.Status.AVAILABLE)
        return queryset

    @extend_schema(
        summary="Upload vehicle image",
        description="Upload an image for a vehicle (admin only).",
        tags=['Vehicles'],
        request=VehicleImageSerializer,
        responses={201: VehicleImageSerializer},
    )
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, pk=None):
        """Upload an image for a vehicle."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        vehicle = self.get_object()
        serializer = VehicleImageSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(vehicle=vehicle)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
