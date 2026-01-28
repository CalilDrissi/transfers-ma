import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from datetime import timedelta


class Rental(models.Model):
    """Car rental booking model."""

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        CONFIRMED = 'confirmed', _('Confirmed')
        ACTIVE = 'active', _('Active')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')

    class InsuranceType(models.TextChoices):
        BASIC = 'basic', _('Basic Coverage')
        STANDARD = 'standard', _('Standard Coverage')
        PREMIUM = 'premium', _('Premium Coverage')
        NONE = 'none', _('No Insurance')

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
        related_name='rentals',
        verbose_name=_('customer')
    )
    customer_name = models.CharField(_('customer name'), max_length=200)
    customer_email = models.EmailField(_('customer email'))
    customer_phone = models.CharField(_('customer phone'), max_length=20)

    # Driver info
    driver_license_number = models.CharField(_('driver license number'), max_length=50)
    driver_license_expiry = models.DateField(_('driver license expiry'))
    driver_date_of_birth = models.DateField(_('driver date of birth'))

    # Vehicle
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.PROTECT,
        related_name='rentals',
        verbose_name=_('vehicle')
    )

    # Rental period
    pickup_datetime = models.DateTimeField(_('pickup date and time'))
    return_datetime = models.DateTimeField(_('return date and time'))

    # Pickup and return locations (text-based)
    pickup_location = models.CharField(
        _('pickup location'),
        max_length=200,
        help_text=_('Pickup location name or address')
    )
    return_location = models.CharField(
        _('return location'),
        max_length=200,
        help_text=_('Return location name or address')
    )

    # Insurance
    insurance_type = models.CharField(
        _('insurance type'),
        max_length=20,
        choices=InsuranceType.choices,
        default=InsuranceType.BASIC
    )

    # Pricing
    daily_rate = models.DecimalField(_('daily rate'), max_digits=10, decimal_places=2)
    total_days = models.PositiveSmallIntegerField(_('total days'))
    subtotal = models.DecimalField(_('subtotal'), max_digits=10, decimal_places=2)
    insurance_cost = models.DecimalField(
        _('insurance cost'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    extras_cost = models.DecimalField(
        _('extras cost'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    different_location_fee = models.DecimalField(
        _('different location fee'),
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_('Fee for returning at different location')
    )
    discount = models.DecimalField(
        _('discount'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    total_price = models.DecimalField(_('total price'), max_digits=10, decimal_places=2)
    deposit = models.DecimalField(
        _('security deposit'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    currency = models.CharField(_('currency'), max_length=3, default='MAD')

    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    # Notes
    special_requests = models.TextField(_('special requests'), blank=True)
    internal_notes = models.TextField(_('internal notes'), blank=True)

    # Actual pickup/return
    actual_pickup_datetime = models.DateTimeField(
        _('actual pickup time'),
        null=True,
        blank=True
    )
    actual_return_datetime = models.DateTimeField(
        _('actual return time'),
        null=True,
        blank=True
    )
    pickup_mileage = models.PositiveIntegerField(
        _('pickup mileage'),
        null=True,
        blank=True
    )
    return_mileage = models.PositiveIntegerField(
        _('return mileage'),
        null=True,
        blank=True
    )
    fuel_level_pickup = models.CharField(
        _('fuel level at pickup'),
        max_length=20,
        blank=True
    )
    fuel_level_return = models.CharField(
        _('fuel level at return'),
        max_length=20,
        blank=True
    )

    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('rental')
        verbose_name_plural = _('rentals')
        ordering = ['-pickup_datetime']

    def __str__(self):
        return f"{self.booking_ref} - {self.vehicle.name}"

    def save(self, *args, **kwargs):
        if not self.booking_ref:
            self.booking_ref = self.generate_booking_ref()
        if not self.total_days:
            self.total_days = self.calculate_days()
        if not self.subtotal:
            self.subtotal = self.calculate_subtotal()
        if not self.total_price:
            self.total_price = self.calculate_total()
        super().save(*args, **kwargs)

    def generate_booking_ref(self):
        return f"RNT-{uuid.uuid4().hex[:8].upper()}"

    def calculate_days(self):
        """Calculate rental days."""
        delta = self.return_datetime - self.pickup_datetime
        days = delta.days
        if delta.seconds > 0:
            days += 1
        return max(1, days)

    def calculate_subtotal(self):
        """Calculate subtotal based on daily rate and days."""
        return self.daily_rate * self.total_days

    def calculate_total(self):
        """Calculate total price."""
        return (
            self.subtotal +
            self.insurance_cost +
            self.extras_cost +
            self.different_location_fee -
            self.discount
        )


class RentalExtra(models.Model):
    """Additional extras for rentals (GPS, child seat, etc.)."""

    name = models.CharField(_('name'), max_length=100)
    description = models.TextField(_('description'), blank=True)
    daily_price = models.DecimalField(_('daily price'), max_digits=10, decimal_places=2)
    max_price = models.DecimalField(
        _('maximum price'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Maximum price cap regardless of rental duration')
    )
    is_active = models.BooleanField(_('active'), default=True)

    class Meta:
        verbose_name = _('rental extra')
        verbose_name_plural = _('rental extras')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.daily_price}/day)"

    def calculate_price(self, days):
        """Calculate price for given number of days."""
        total = self.daily_price * days
        if self.max_price:
            return min(total, self.max_price)
        return total


class RentalExtraBooking(models.Model):
    """Extras booked for a specific rental."""

    rental = models.ForeignKey(
        Rental,
        on_delete=models.CASCADE,
        related_name='booked_extras',
        verbose_name=_('rental')
    )
    extra = models.ForeignKey(
        RentalExtra,
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
        return f"{self.extra.name} x{self.quantity} for {self.rental.booking_ref}"


class InsuranceOption(models.Model):
    """Insurance options for rentals."""

    insurance_type = models.CharField(
        _('insurance type'),
        max_length=20,
        choices=Rental.InsuranceType.choices,
        unique=True
    )
    name = models.CharField(_('name'), max_length=100)
    description = models.TextField(_('description'))
    daily_price = models.DecimalField(_('daily price'), max_digits=10, decimal_places=2)
    deductible = models.DecimalField(
        _('deductible'),
        max_digits=10,
        decimal_places=2,
        help_text=_('Amount customer pays in case of damage')
    )
    coverage_details = models.TextField(
        _('coverage details'),
        blank=True,
        help_text=_('What is covered by this insurance')
    )
    is_active = models.BooleanField(_('active'), default=True)

    class Meta:
        verbose_name = _('insurance option')
        verbose_name_plural = _('insurance options')
        ordering = ['daily_price']

    def __str__(self):
        return f"{self.name} ({self.daily_price}/day)"
