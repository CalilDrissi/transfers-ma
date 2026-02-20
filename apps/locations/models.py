from django.db import models
from django.utils.translation import gettext_lazy as _


class Zone(models.Model):
    """Geographic zones for pricing with distance-based ranges and geolocation."""

    name = models.CharField(_('name'), max_length=100)
    slug = models.SlugField(_('slug'), unique=True, max_length=100)
    description = models.TextField(_('description'), blank=True)
    color = models.CharField(
        _('color'),
        max_length=7,
        default='#3498db',
        help_text=_('Hex color for map display')
    )
    # Geolocation - center point of the zone
    center_latitude = models.DecimalField(
        _('center latitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        help_text=_('Latitude of zone center point')
    )
    center_longitude = models.DecimalField(
        _('center longitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        help_text=_('Longitude of zone center point')
    )
    # Radius in kilometers for circular zone boundary
    radius_km = models.DecimalField(
        _('radius (km)'),
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        default=10,
        help_text=_('Radius of the zone in kilometers')
    )
    # Polygon coordinates stored as JSON for complex zone shapes (optional)
    polygon_coordinates = models.JSONField(
        _('polygon coordinates'),
        null=True,
        blank=True,
        help_text=_('GeoJSON polygon coordinates defining zone boundary')
    )
    is_active = models.BooleanField(_('active'), default=True)
    deposit_percentage = models.DecimalField(
        _('deposit percentage'), max_digits=5, decimal_places=2,
        default=0, help_text=_('Percentage of total price required as deposit (0-100)')
    )
    # Customer-facing information fields
    client_notice = models.TextField(_('client notice'), blank=True, help_text=_('Notice shown to customers for this zone'))
    client_notice_type = models.CharField(
        _('notice type'), max_length=20, blank=True, default='info',
        choices=[('info', _('Info')), ('warning', _('Warning')), ('success', _('Success'))],
    )
    pickup_instructions = models.TextField(_('pickup instructions'), blank=True, help_text=_('Pickup instructions for customers'))
    area_description = models.TextField(_('area description'), blank=True, help_text=_('Description of the area for customers'))
    display_order = models.PositiveSmallIntegerField(_('display order'), default=0)
    custom_info = models.JSONField(
        _('custom information'),
        default=dict,
        blank=True,
        help_text=_('Custom key-value data for this zone')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('zone')
        verbose_name_plural = _('zones')
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name

    def get_range_for_distance(self, distance_km):
        """Get the range that matches a given distance."""
        return self.distance_ranges.filter(
            is_active=True,
            min_km__lte=distance_km,
            max_km__gte=distance_km
        ).first()

    @property
    def has_coordinates(self):
        """Check if zone has geolocation set."""
        return self.center_latitude is not None and self.center_longitude is not None


class ZoneDistanceRange(models.Model):
    """Distance ranges within a zone (without price - price is set separately)."""

    zone = models.ForeignKey(
        Zone,
        on_delete=models.CASCADE,
        related_name='distance_ranges',
        verbose_name=_('zone')
    )
    name = models.CharField(
        _('range name'),
        max_length=100,
        help_text=_('e.g., "Short distance", "Medium distance", "Long distance"')
    )
    min_km = models.DecimalField(
        _('minimum distance (km)'),
        max_digits=8,
        decimal_places=2,
        default=0
    )
    max_km = models.DecimalField(
        _('maximum distance (km)'),
        max_digits=8,
        decimal_places=2
    )
    is_active = models.BooleanField(_('active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('zone distance range')
        verbose_name_plural = _('zone distance ranges')
        ordering = ['zone', 'min_km']

    def __str__(self):
        return f"{self.zone.name}: {self.min_km}-{self.max_km} km"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.min_km >= self.max_km:
            raise ValidationError(_('Minimum distance must be less than maximum distance.'))
        # Check for overlapping ranges in the same zone
        overlapping = ZoneDistanceRange.objects.filter(
            zone=self.zone,
            is_active=True
        ).exclude(pk=self.pk).filter(
            models.Q(min_km__lt=self.max_km, max_km__gt=self.min_km)
        )
        if overlapping.exists():
            raise ValidationError(_('This range overlaps with an existing range in this zone.'))


class ZonePricing(models.Model):
    """Pricing rules between zones."""

    from_zone = models.ForeignKey(
        Zone,
        on_delete=models.CASCADE,
        related_name='pricing_from',
        verbose_name=_('from zone')
    )
    to_zone = models.ForeignKey(
        Zone,
        on_delete=models.CASCADE,
        related_name='pricing_to',
        verbose_name=_('to zone')
    )
    vehicle_category = models.ForeignKey(
        'vehicles.VehicleCategory',
        on_delete=models.CASCADE,
        related_name='zone_pricing',
        verbose_name=_('vehicle category')
    )
    price = models.DecimalField(_('price'), max_digits=10, decimal_places=2)
    is_active = models.BooleanField(_('active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('zone pricing')
        verbose_name_plural = _('zone pricing')
        unique_together = ['from_zone', 'to_zone', 'vehicle_category']

    def __str__(self):
        return f"{self.from_zone} → {self.to_zone} ({self.vehicle_category}): {self.price}"


class Route(models.Model):
    """Long-distance transfer routes with origin and destination."""

    name = models.CharField(
        _('route name'),
        max_length=200,
        help_text=_('e.g., "Marrakech to Casablanca"')
    )
    slug = models.SlugField(_('slug'), unique=True, max_length=200)
    description = models.TextField(_('description'), blank=True)

    # Origin
    origin_name = models.CharField(
        _('origin'),
        max_length=200,
        help_text=_('Origin city or location name')
    )
    origin_latitude = models.DecimalField(
        _('origin latitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    origin_longitude = models.DecimalField(
        _('origin longitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    origin_radius_km = models.DecimalField(
        _('origin radius (km)'),
        max_digits=6,
        decimal_places=2,
        default=10,
        help_text=_('Pickup area radius in kilometers')
    )

    # Destination
    destination_name = models.CharField(
        _('destination'),
        max_length=200,
        help_text=_('Destination city or location name')
    )
    destination_latitude = models.DecimalField(
        _('destination latitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    destination_longitude = models.DecimalField(
        _('destination longitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    destination_radius_km = models.DecimalField(
        _('destination radius (km)'),
        max_digits=6,
        decimal_places=2,
        default=10,
        help_text=_('Dropoff area radius in kilometers')
    )

    # Distance
    distance_km = models.DecimalField(
        _('distance (km)'),
        max_digits=8,
        decimal_places=2,
        help_text=_('Approximate distance in kilometers')
    )
    estimated_duration_minutes = models.PositiveIntegerField(
        _('estimated duration (minutes)'),
        null=True,
        blank=True,
        help_text=_('Estimated travel time in minutes')
    )

    # Settings
    is_bidirectional = models.BooleanField(
        _('bidirectional'),
        default=True,
        help_text=_('If true, the same pricing applies for reverse direction')
    )
    is_active = models.BooleanField(_('active'), default=True)
    is_popular = models.BooleanField(
        _('popular route'),
        default=False,
        help_text=_('Show this route prominently on the website')
    )
    order = models.PositiveSmallIntegerField(_('display order'), default=0)
    deposit_percentage = models.DecimalField(
        _('deposit percentage'), max_digits=5, decimal_places=2,
        default=0, help_text=_('Percentage of total price required as deposit (0-100)')
    )
    # Customer-facing information fields
    client_notice = models.TextField(_('client notice'), blank=True, help_text=_('Notice shown to customers for this route'))
    client_notice_type = models.CharField(
        _('notice type'), max_length=20, blank=True, default='info',
        choices=[('info', _('Info')), ('warning', _('Warning')), ('success', _('Success'))],
    )
    route_description = models.TextField(_('route description'), blank=True, help_text=_('Detailed customer-facing route description'))
    highlights = models.JSONField(_('highlights'), default=list, blank=True, help_text=_('List of highlight strings'))
    travel_tips = models.TextField(_('travel tips'), blank=True, help_text=_('Travel tips for customers'))
    estimated_traffic_info = models.TextField(_('traffic info'), blank=True, help_text=_('Estimated traffic information'))
    included_amenities = models.JSONField(_('included amenities'), default=list, blank=True, help_text=_('List of included amenity strings'))
    cancellation_policy_override = models.TextField(_('cancellation policy'), blank=True, help_text=_('Override cancellation policy for this route'))
    custom_info = models.JSONField(
        _('custom information'),
        default=dict,
        blank=True,
        help_text=_('Custom key-value data for this route')
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('route')
        verbose_name_plural = _('routes')
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.origin_name} → {self.destination_name}"

    @property
    def reverse_name(self):
        """Get the reverse route name."""
        return f"{self.destination_name} → {self.origin_name}"

    @property
    def estimated_duration_display(self):
        """Return duration in hours and minutes format."""
        if not self.estimated_duration_minutes:
            return None
        hours = self.estimated_duration_minutes // 60
        minutes = self.estimated_duration_minutes % 60
        if hours and minutes:
            return f"{hours}h {minutes}min"
        elif hours:
            return f"{hours}h"
        return f"{minutes}min"

    @property
    def has_zones(self):
        """Check if this route has any pickup or dropoff zones defined."""
        return self.pickup_zones.filter(is_active=True).exists() or \
               self.dropoff_zones.filter(is_active=True).exists()

    def get_default_pricing(self, vehicle):
        """Get the default (non-zone-specific) pricing for a vehicle."""
        return self.vehicle_pricing.filter(
            vehicle=vehicle,
            pickup_zone__isnull=True,
            dropoff_zone__isnull=True,
            is_active=True
        ).first()

    def get_zone_pricing(self, vehicle, pickup_zone, dropoff_zone):
        """Get zone-specific pricing for a vehicle, with fallback to defaults."""
        # First try exact match
        pricing = self.vehicle_pricing.filter(
            vehicle=vehicle,
            pickup_zone=pickup_zone,
            dropoff_zone=dropoff_zone,
            is_active=True
        ).first()

        if pricing:
            return pricing

        # Try pickup zone only
        if pickup_zone:
            pricing = self.vehicle_pricing.filter(
                vehicle=vehicle,
                pickup_zone=pickup_zone,
                dropoff_zone__isnull=True,
                is_active=True
            ).first()
            if pricing:
                return pricing

        # Try dropoff zone only
        if dropoff_zone:
            pricing = self.vehicle_pricing.filter(
                vehicle=vehicle,
                pickup_zone__isnull=True,
                dropoff_zone=dropoff_zone,
                is_active=True
            ).first()
            if pricing:
                return pricing

        # Fall back to default pricing
        return self.get_default_pricing(vehicle)


class RoutePickupZone(models.Model):
    """Pickup zones within a route's origin area."""

    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name='pickup_zones',
        verbose_name=_('route')
    )
    name = models.CharField(
        _('zone name'),
        max_length=200,
        help_text=_('e.g., "Airport Terminal", "City Center", "Medina"')
    )
    center_latitude = models.DecimalField(
        _('center latitude'),
        max_digits=10,
        decimal_places=7
    )
    center_longitude = models.DecimalField(
        _('center longitude'),
        max_digits=10,
        decimal_places=7
    )
    radius_km = models.DecimalField(
        _('radius (km)'),
        max_digits=6,
        decimal_places=2,
        default=5,
        help_text=_('Pickup area radius in kilometers')
    )
    color = models.CharField(
        _('color'),
        max_length=7,
        default='#28a745',
        help_text=_('Hex color for map display')
    )
    price_adjustment = models.DecimalField(
        _('price adjustment'), max_digits=10, decimal_places=2, default=0,
        help_text=_('Amount added to vehicle price when pickup is in this zone')
    )
    order = models.PositiveSmallIntegerField(_('display order'), default=0)
    is_active = models.BooleanField(_('active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('route pickup zone')
        verbose_name_plural = _('route pickup zones')
        ordering = ['route', 'order', 'name']

    def __str__(self):
        return f"{self.route.name} - Pickup: {self.name}"


class RouteDropoffZone(models.Model):
    """Dropoff zones within a route's destination area."""

    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name='dropoff_zones',
        verbose_name=_('route')
    )
    name = models.CharField(
        _('zone name'),
        max_length=200,
        help_text=_('e.g., "Airport Terminal", "City Center", "Hotel Area"')
    )
    center_latitude = models.DecimalField(
        _('center latitude'),
        max_digits=10,
        decimal_places=7
    )
    center_longitude = models.DecimalField(
        _('center longitude'),
        max_digits=10,
        decimal_places=7
    )
    radius_km = models.DecimalField(
        _('radius (km)'),
        max_digits=6,
        decimal_places=2,
        default=5,
        help_text=_('Dropoff area radius in kilometers')
    )
    color = models.CharField(
        _('color'),
        max_length=7,
        default='#dc3545',
        help_text=_('Hex color for map display')
    )
    price_adjustment = models.DecimalField(
        _('price adjustment'), max_digits=10, decimal_places=2, default=0,
        help_text=_('Amount added to vehicle price when dropoff is in this zone')
    )
    order = models.PositiveSmallIntegerField(_('display order'), default=0)
    is_active = models.BooleanField(_('active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('route dropoff zone')
        verbose_name_plural = _('route dropoff zones')
        ordering = ['route', 'order', 'name']

    def __str__(self):
        return f"{self.route.name} - Dropoff: {self.name}"


class VehicleRoutePricing(models.Model):
    """Pricing for individual vehicles on specific routes, optionally by zone combination."""

    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='route_pricing',
        verbose_name=_('vehicle')
    )
    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name='vehicle_pricing',
        verbose_name=_('route')
    )
    # Optional zone-specific pricing
    pickup_zone = models.ForeignKey(
        RoutePickupZone,
        on_delete=models.CASCADE,
        related_name='pricing',
        verbose_name=_('pickup zone'),
        null=True,
        blank=True,
        help_text=_('Leave empty for route-wide default pricing')
    )
    dropoff_zone = models.ForeignKey(
        RouteDropoffZone,
        on_delete=models.CASCADE,
        related_name='pricing',
        verbose_name=_('dropoff zone'),
        null=True,
        blank=True,
        help_text=_('Leave empty for route-wide default pricing')
    )
    price = models.DecimalField(
        _('price'),
        max_digits=10,
        decimal_places=2,
        help_text=_('Fixed price for this vehicle on this route/zone combination')
    )
    cost = models.DecimalField(
        _('cost'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Cost from supplier for this route/zone combination')
    )
    deposit = models.DecimalField(
        _('deposit'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Deposit amount required for booking')
    )
    min_booking_hours = models.PositiveIntegerField(
        _('minimum booking hours'),
        null=True,
        blank=True,
        help_text=_('Minimum hours in advance required to book')
    )
    is_active = models.BooleanField(_('active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('vehicle route pricing')
        verbose_name_plural = _('vehicle route pricing')
        constraints = [
            models.UniqueConstraint(
                fields=['vehicle', 'route', 'pickup_zone', 'dropoff_zone'],
                name='unique_vehicle_route_zone_pricing'
            )
        ]
        ordering = ['vehicle', 'route', 'pickup_zone', 'dropoff_zone']

    def __str__(self):
        zones = ""
        if self.pickup_zone or self.dropoff_zone:
            pickup = self.pickup_zone.name if self.pickup_zone else "Any"
            dropoff = self.dropoff_zone.name if self.dropoff_zone else "Any"
            zones = f" ({pickup} → {dropoff})"
        return f"{self.vehicle.name} - {self.route}{zones}: {self.price} MAD"

    @property
    def is_zone_specific(self):
        """Check if this is zone-specific pricing."""
        return self.pickup_zone is not None or self.dropoff_zone is not None
