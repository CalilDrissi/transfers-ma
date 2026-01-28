import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class Transfer(models.Model):
    """Transfer booking model for point-to-point transfers."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        CONFIRMED = 'confirmed', _('Confirmed')
        ASSIGNED = 'assigned', _('Driver Assigned')
        IN_PROGRESS = 'in_progress', _('In Progress')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')
        NO_SHOW = 'no_show', _('No Show')

    class TransferType(models.TextChoices):
        AIRPORT_PICKUP = 'airport_pickup', _('Airport Pickup')
        AIRPORT_DROPOFF = 'airport_dropoff', _('Airport Drop-off')
        CITY_TO_CITY = 'city_to_city', _('City to City')
        PORT_TRANSFER = 'port_transfer', _('Port Transfer')
        CUSTOM = 'custom', _('Custom Transfer')

    # Booking reference
    booking_ref = models.CharField(
        _('booking reference'),
        max_length=20,
        unique=True,
        editable=False
    )

    # Customer info
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transfers',
        verbose_name=_('customer')
    )
    customer_name = models.CharField(_('customer name'), max_length=200)
    customer_email = models.EmailField(_('customer email'))
    customer_phone = models.CharField(_('customer phone'), max_length=20)

    # Transfer details
    transfer_type = models.CharField(
        _('transfer type'),
        max_length=20,
        choices=TransferType.choices,
        default=TransferType.CUSTOM
    )
    # Pickup location
    pickup_address = models.TextField(
        _('pickup address'),
        help_text=_('Full pickup address')
    )
    pickup_latitude = models.DecimalField(
        _('pickup latitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    pickup_longitude = models.DecimalField(
        _('pickup longitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    # Dropoff location
    dropoff_address = models.TextField(
        _('drop-off address'),
        help_text=_('Full drop-off address')
    )
    dropoff_latitude = models.DecimalField(
        _('drop-off latitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    dropoff_longitude = models.DecimalField(
        _('drop-off longitude'),
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )
    # Calculated distance
    distance_km = models.DecimalField(
        _('distance (km)'),
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    duration_minutes = models.PositiveIntegerField(
        _('estimated duration (minutes)'),
        null=True,
        blank=True
    )

    # Date and time
    pickup_datetime = models.DateTimeField(_('pickup date and time'))

    # Flight info (for airport transfers)
    flight_number = models.CharField(_('flight number'), max_length=20, blank=True)
    flight_arrival_time = models.TimeField(_('flight arrival time'), null=True, blank=True)

    # Passengers and luggage
    passengers = models.PositiveSmallIntegerField(_('number of passengers'), default=1)
    luggage = models.PositiveSmallIntegerField(_('number of luggage'), default=1)
    child_seats = models.PositiveSmallIntegerField(_('child seats required'), default=0)

    # Vehicle and driver
    vehicle_category = models.ForeignKey(
        'vehicles.VehicleCategory',
        on_delete=models.PROTECT,
        related_name='transfers',
        verbose_name=_('vehicle category')
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transfers',
        verbose_name=_('assigned vehicle')
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_transfers',
        verbose_name=_('assigned driver')
    )

    # Pricing
    base_price = models.DecimalField(_('base price'), max_digits=10, decimal_places=2)
    extras_price = models.DecimalField(
        _('extras price'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    discount = models.DecimalField(
        _('discount'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    total_price = models.DecimalField(_('total price'), max_digits=10, decimal_places=2)
    currency = models.CharField(_('currency'), max_length=3, default='MAD')

    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    # Additional info
    special_requests = models.TextField(_('special requests'), blank=True)
    internal_notes = models.TextField(_('internal notes'), blank=True)

    # Round trip
    is_round_trip = models.BooleanField(_('round trip'), default=False)
    return_datetime = models.DateTimeField(_('return date and time'), null=True, blank=True)
    return_transfer = models.OneToOneField(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbound_transfer',
        verbose_name=_('return transfer')
    )

    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('transfer')
        verbose_name_plural = _('transfers')
        ordering = ['-pickup_datetime']

    def __str__(self):
        pickup_short = self.pickup_address[:30] + '...' if len(self.pickup_address) > 30 else self.pickup_address
        dropoff_short = self.dropoff_address[:30] + '...' if len(self.dropoff_address) > 30 else self.dropoff_address
        return f"{self.booking_ref} - {pickup_short} to {dropoff_short}"

    def save(self, *args, **kwargs):
        if not self.booking_ref:
            self.booking_ref = self.generate_booking_ref()
        if not self.total_price:
            self.total_price = self.calculate_total()
        super().save(*args, **kwargs)

    def generate_booking_ref(self):
        """Generate a unique booking reference."""
        return f"TRF-{uuid.uuid4().hex[:8].upper()}"

    def calculate_total(self):
        """Calculate total price."""
        return self.base_price + self.extras_price - self.discount


class TransferExtra(models.Model):
    """Additional extras for transfers (child seats, meet & greet, etc.)."""

    name = models.CharField(_('name'), max_length=100)
    description = models.TextField(_('description'), blank=True)
    price = models.DecimalField(_('price'), max_digits=10, decimal_places=2)
    is_per_item = models.BooleanField(
        _('price per item'),
        default=False,
        help_text=_('If checked, price is multiplied by quantity')
    )
    is_active = models.BooleanField(_('active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('transfer extra')
        verbose_name_plural = _('transfer extras')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.price})"


class TransferExtraBooking(models.Model):
    """Extras booked for a specific transfer."""

    transfer = models.ForeignKey(
        Transfer,
        on_delete=models.CASCADE,
        related_name='booked_extras',
        verbose_name=_('transfer')
    )
    extra = models.ForeignKey(
        TransferExtra,
        on_delete=models.PROTECT,
        related_name='bookings',
        verbose_name=_('extra')
    )
    quantity = models.PositiveSmallIntegerField(_('quantity'), default=1)
    price = models.DecimalField(_('price'), max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = _('booked extra')
        verbose_name_plural = _('booked extras')

    def __str__(self):
        return f"{self.extra.name} x{self.quantity} for {self.transfer.booking_ref}"
