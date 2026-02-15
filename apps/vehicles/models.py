from django.db import models
from django.utils.translation import gettext_lazy as _


class VehicleCategory(models.Model):
    """Vehicle categories like Sedan, SUV, Van, Luxury, etc."""

    name = models.CharField(_('name'), max_length=100)
    slug = models.SlugField(_('slug'), unique=True, max_length=100)
    description = models.TextField(_('description'), blank=True)
    max_passengers = models.PositiveSmallIntegerField(_('max passengers'), default=4)
    max_luggage = models.PositiveSmallIntegerField(_('max luggage'), default=3)
    price_multiplier = models.DecimalField(
        _('price multiplier'),
        max_digits=4,
        decimal_places=2,
        default=1.00,
        help_text=_('Multiplier applied to base route price')
    )
    icon = models.CharField(
        _('icon'),
        max_length=50,
        blank=True,
        help_text=_('CSS icon class or icon name')
    )
    image = models.ImageField(
        _('image'),
        upload_to='vehicle_categories/',
        blank=True,
        null=True
    )
    is_active = models.BooleanField(_('active'), default=True)
    order = models.PositiveSmallIntegerField(_('display order'), default=0)
    # Customer-facing information fields
    tagline = models.CharField(_('tagline'), max_length=200, blank=True, help_text=_('Short tagline shown on results page'))
    included_amenities = models.JSONField(_('included amenities'), default=list, blank=True, help_text=_('List of included amenity strings'))
    not_included = models.JSONField(_('not included'), default=list, blank=True, help_text=_('List of items not included'))
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('vehicle category')
        verbose_name_plural = _('vehicle categories')
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class VehicleFeature(models.Model):
    """Features that vehicles can have (WiFi, AC, leather seats, etc.)."""

    name = models.CharField(_('name'), max_length=100)
    icon = models.CharField(_('icon'), max_length=50, blank=True)
    is_active = models.BooleanField(_('active'), default=True)

    class Meta:
        verbose_name = _('vehicle feature')
        verbose_name_plural = _('vehicle features')
        ordering = ['name']

    def __str__(self):
        return self.name


class Vehicle(models.Model):
    """Individual vehicles in the fleet."""

    class Status(models.TextChoices):
        AVAILABLE = 'available', _('Available')
        IN_USE = 'in_use', _('In Use')
        MAINTENANCE = 'maintenance', _('Under Maintenance')
        INACTIVE = 'inactive', _('Inactive')

    class ServiceType(models.TextChoices):
        TRANSFER = 'transfer', _('Transfer')
        RENTAL = 'rental', _('Rental')

    category = models.ForeignKey(
        VehicleCategory,
        on_delete=models.PROTECT,
        related_name='vehicles',
        verbose_name=_('category')
    )
    name = models.CharField(
        _('name'),
        max_length=100,
        help_text=_('e.g., Mercedes E-Class')
    )
    license_plate = models.CharField(
        _('license plate'),
        max_length=20,
        blank=True,
        null=True
    )
    year = models.PositiveSmallIntegerField(_('year'), blank=True, null=True)
    color = models.CharField(_('color'), max_length=50, blank=True)
    passengers = models.PositiveSmallIntegerField(_('passenger capacity'))
    luggage = models.PositiveSmallIntegerField(_('luggage capacity'))
    supplier_name = models.CharField(_('supplier name'), max_length=200, blank=True)
    features = models.ManyToManyField(
        VehicleFeature,
        blank=True,
        related_name='vehicles',
        verbose_name=_('features')
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE
    )
    notes = models.TextField(_('notes'), blank=True)
    # Customer-facing information fields
    client_description = models.TextField(_('client description'), blank=True, help_text=_('Customer-facing vehicle description'))
    key_features = models.JSONField(_('key features'), default=list, blank=True, help_text=_('List of key feature strings'))
    important_note = models.TextField(_('important note'), blank=True, help_text=_('Important note shown to customers'))
    important_note_type = models.CharField(
        _('note type'), max_length=20, blank=True, default='info',
        choices=[('info', _('Info')), ('warning', _('Warning')), ('success', _('Success'))],
    )
    custom_info = models.JSONField(
        _('custom information'),
        default=dict,
        blank=True,
        help_text=_('Custom key-value data for this vehicle')
    )
    is_active = models.BooleanField(_('active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    # Service type
    service_type = models.CharField(
        _('service type'),
        max_length=20,
        choices=ServiceType.choices,
        default=ServiceType.TRANSFER,
        help_text=_('What service this vehicle is available for')
    )

    # For car rentals
    daily_rate = models.DecimalField(
        _('daily rental rate'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    weekly_rate = models.DecimalField(
        _('weekly rental rate'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = _('vehicle')
        verbose_name_plural = _('vehicles')
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.license_plate})"

    @property
    def is_available_for_transfer(self):
        return self.service_type == self.ServiceType.TRANSFER

    @property
    def is_available_for_rental(self):
        return self.service_type == self.ServiceType.RENTAL


class VehicleImage(models.Model):
    """Gallery images for vehicles."""

    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name=_('vehicle')
    )
    image = models.ImageField(_('image'), upload_to='vehicles/')
    caption = models.CharField(_('caption'), max_length=200, blank=True)
    is_primary = models.BooleanField(_('primary image'), default=False)
    order = models.PositiveSmallIntegerField(_('display order'), default=0)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('vehicle image')
        verbose_name_plural = _('vehicle images')
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Image for {self.vehicle.name}"

    def save(self, *args, **kwargs):
        # Ensure only one primary image per vehicle
        if self.is_primary:
            VehicleImage.objects.filter(
                vehicle=self.vehicle,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class VehicleZonePricing(models.Model):
    """Pricing for individual vehicles per zone distance range."""

    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='zone_pricing',
        verbose_name=_('vehicle')
    )
    zone_distance_range = models.ForeignKey(
        'locations.ZoneDistanceRange',
        on_delete=models.CASCADE,
        related_name='vehicle_pricing',
        verbose_name=_('zone distance range')
    )
    price = models.DecimalField(
        _('price'),
        max_digits=10,
        decimal_places=2,
        help_text=_('Fixed price for this vehicle in this distance range')
    )
    cost = models.DecimalField(
        _('cost'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Cost from supplier for this distance range')
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
        verbose_name = _('vehicle zone pricing')
        verbose_name_plural = _('vehicle zone pricing')
        unique_together = ['vehicle', 'zone_distance_range']
        ordering = ['vehicle', 'zone_distance_range']

    def __str__(self):
        return f"{self.vehicle.name} - {self.zone_distance_range}: {self.price} MAD"
